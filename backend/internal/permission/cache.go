package permission

import "sync"

// snapshotCache guarda o snapshot de cada servidor até alguém avisar que ele
// mudou. Não tem TTL: toda escrita em cargos, membros, canais e sobrescritas
// chama InvalidateServer/InvalidateChannel depois do commit (os repositórios
// fazem isso). Os snapshots guardados são compartilhados: só leitura.
//
// Leituras simultâneas do mesmo servidor viram uma ida ao banco só. A geração
// por servidor impede que uma leitura que começou antes de uma escrita grave o
// snapshot velho depois da invalidação.
type snapshotCache struct {
	mu       sync.Mutex
	snaps    map[string]*Snapshot
	gens     map[string]uint64
	inflight map[string]*snapshotLoad
	// channels: canal -> servidor, só dos canais dos snapshots guardados.
	channels map[string]string
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
		snaps:    map[string]*Snapshot{},
		gens:     map[string]uint64{},
		inflight: map[string]*snapshotLoad{},
		channels: map[string]string{},
	}
}

// begin devolve o snapshot guardado ou a leitura a esperar. leader = true: não
// há leitura em andamento e quem chamou deve ler e chamar finish.
func (c *snapshotCache) begin(serverID string) (snap *Snapshot, load *snapshotLoad, leader bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if snap, ok := c.snaps[serverID]; ok {
		return snap, nil, false
	}
	if load, ok := c.inflight[serverID]; ok {
		return nil, load, false
	}
	load = &snapshotLoad{done: make(chan struct{}), gen: c.gens[serverID]}
	c.inflight[serverID] = load
	return nil, load, true
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
		c.snaps[serverID] = snap
		for channelID := range snap.Channels {
			c.channels[channelID] = serverID
		}
	}
	c.mu.Unlock()
	close(load.done)
}

// serverOf: o servidor do canal, se algum snapshot guardado o tem.
func (c *snapshotCache) serverOf(channelID string) (string, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	serverID, ok := c.channels[channelID]
	return serverID, ok
}

// invalidate esquece o snapshot do servidor (e os canais dele) e faz quem
// chegar depois ler de novo, sem pegar carona numa leitura antiga.
func (c *snapshotCache) invalidate(serverID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.invalidateLocked(serverID)
}

func (c *snapshotCache) invalidateLocked(serverID string) {
	if snap, ok := c.snaps[serverID]; ok {
		for channelID := range snap.Channels {
			delete(c.channels, channelID)
		}
		delete(c.snaps, serverID)
	}
	delete(c.inflight, serverID)
	c.gens[serverID]++
}

// invalidateChannel invalida o servidor do canal, se ele estiver guardado
// (canal fora do índice não está em nenhum snapshot guardado).
func (c *snapshotCache) invalidateChannel(channelID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if serverID, ok := c.channels[channelID]; ok {
		c.invalidateLocked(serverID)
	}
}
