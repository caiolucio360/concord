package permission

import "sync"

// snapshotCache guarda o snapshot de cada servidor até alguém avisar que ele
// mudou. Não tem TTL: toda escrita em cargos, membros, canais e sobrescritas
// chama InvalidateServer/InvalidateChannel depois do commit (os repositórios
// fazem isso). Os snapshots guardados são compartilhados: só leitura.
//
// Vale para uma instância só do backend (como o hub do WebSocket): não há
// invalidação entre processos.
//
// Leituras simultâneas do mesmo servidor viram uma ida ao banco só. A geração
// por servidor impede que uma leitura que começou antes de uma escrita grave o
// snapshot velho depois da invalidação (como o lease do memcache do Facebook).
//
// O acerto (o caminho quente) não trava: snaps e channels são sync.Map, que lê
// sem lock no caso "grava uma vez, lê muitas". Toda escrita neles, gens e
// inflight acontece com mu.
type snapshotCache struct {
	snaps sync.Map // servidor -> *Snapshot
	// channels: canal -> servidor, só dos canais dos snapshots guardados.
	channels sync.Map

	mu       sync.Mutex
	gens     map[string]uint64
	inflight map[string]*snapshotLoad

	stats cacheCounters
}

// snapshotLoad é uma leitura em andamento; done fecha quando snap/err valem.
type snapshotLoad struct {
	done chan struct{}
	gen  uint64
	snap *Snapshot
	err  error
}

func newSnapshotCache() *snapshotCache {
	return &snapshotCache{
		gens:     map[string]uint64{},
		inflight: map[string]*snapshotLoad{},
	}
}

// begin devolve o snapshot guardado ou a leitura a esperar. leader = true: não
// há leitura em andamento e quem chamou deve ler e chamar finish.
func (c *snapshotCache) begin(serverID string) (snap *Snapshot, load *snapshotLoad, leader bool) {
	if snap, ok := c.cached(serverID); ok {
		c.stats.hits.Add(1)
		return snap, nil, false
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	// De novo com o lock: outra leitura pode ter acabado entre os dois passos.
	if snap, ok := c.cached(serverID); ok {
		c.stats.hits.Add(1)
		return snap, nil, false
	}
	if load, ok := c.inflight[serverID]; ok {
		c.stats.shared.Add(1)
		return nil, load, false
	}
	load = &snapshotLoad{done: make(chan struct{}), gen: c.gens[serverID]}
	c.inflight[serverID] = load
	c.stats.loads.Add(1)
	return nil, load, true
}

// cached: o snapshot guardado, sem lock.
func (c *snapshotCache) cached(serverID string) (*Snapshot, bool) {
	v, ok := c.snaps.Load(serverID)
	if !ok {
		return nil, false
	}
	return v.(*Snapshot), true
}

// finish entrega o resultado a quem espera e guarda o snapshot se nenhuma
// escrita invalidou o servidor no meio da leitura. Erro não é guardado.
func (c *snapshotCache) finish(serverID string, load *snapshotLoad, snap *Snapshot, err error) {
	c.mu.Lock()
	load.snap, load.err = snap, err
	if c.inflight[serverID] == load {
		delete(c.inflight, serverID)
	}
	if err == nil && c.gens[serverID] == load.gen {
		c.snaps.Store(serverID, snap)
		for channelID := range snap.Channels {
			c.channels.Store(channelID, serverID)
		}
	}
	c.mu.Unlock()
	close(load.done)
}

// serverOf: o servidor do canal, se algum snapshot guardado o tem.
func (c *snapshotCache) serverOf(channelID string) (string, bool) {
	v, ok := c.channels.Load(channelID)
	if !ok {
		return "", false
	}
	return v.(string), true
}

// invalidate esquece o snapshot do servidor (e os canais dele) e faz quem
// chegar depois ler de novo, sem pegar carona numa leitura antiga.
func (c *snapshotCache) invalidate(serverID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.invalidateLocked(serverID)
}

func (c *snapshotCache) invalidateLocked(serverID string) {
	if snap, ok := c.cached(serverID); ok {
		for channelID := range snap.Channels {
			c.channels.Delete(channelID)
		}
		c.snaps.Delete(serverID)
	}
	delete(c.inflight, serverID)
	c.gens[serverID]++
	c.stats.invalidations.Add(1)
}

// invalidateChannel invalida o servidor do canal. Canal fora do índice não
// está em nenhum snapshot guardado, mas pode estar numa leitura em andamento
// (de um servidor que não sabemos qual): essas leituras são descartadas.
func (c *snapshotCache) invalidateChannel(channelID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if serverID, ok := c.serverOf(channelID); ok {
		c.invalidateLocked(serverID)
		return
	}
	for serverID := range c.inflight {
		c.invalidateLocked(serverID)
	}
}
