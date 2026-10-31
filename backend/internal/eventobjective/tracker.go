package eventobjective

import "time"

// De quanto em quanto tempo o serviço olha as chamadas (o mesmo do XP de voz).
const tickInterval = 10 * time.Second

type key struct {
	userID, objectiveID string
	occurrence          int64
}

// Drained é o tempo pronto para gravar.
type Drained struct {
	UserID  string
	Target  Target
	Minutes int
}

// tracker soma, em memória, o tempo de cada pessoa em cada objetivo da
// ocorrência (molde de serverlevel/tracker.go). Não sabe de banco: o serviço
// drena e grava.
type tracker struct {
	lastTick time.Time
	pending  map[key]time.Duration
	meta     map[key]Target
	// touched: quem somou desde o último drain (o resto de quem saiu some).
	touched map[key]bool
}

func newTracker(start time.Time) *tracker {
	return &tracker{
		lastTick: start,
		pending:  make(map[key]time.Duration),
		meta:     make(map[key]Target),
		touched:  make(map[key]bool),
	}
}

func keyOf(userID string, t Target) key {
	return key{userID, t.ObjectiveID, t.Occurrence.UnixNano()}
}

// accrue soma o tempo desde o último tick a quem contribui agora.
func (t *tracker) accrue(cs []Contribution, now time.Time) {
	elapsed := now.Sub(t.lastTick)
	t.lastTick = now
	// Servidor travado/suspenso: não dá de uma vez o tempo que ninguém viu.
	if elapsed > 2*tickInterval || elapsed < 0 {
		elapsed = tickInterval
	}
	for _, c := range cs {
		k := keyOf(c.UserID, c.Target)
		t.pending[k] += elapsed
		t.meta[k] = c.Target
		t.touched[k] = true
	}
}

// drain devolve os minutos completos. O resto (< 1 min) fica para o próximo,
// só de quem continua somando: quem saiu perde o que não fechou.
func (t *tracker) drain() []Drained {
	var out []Drained
	for k, d := range t.pending {
		if !t.touched[k] {
			delete(t.pending, k)
			delete(t.meta, k)
			continue
		}
		minutes := int(d / time.Minute)
		t.pending[k] = d - time.Duration(minutes)*time.Minute
		if minutes > 0 {
			out = append(out, Drained{UserID: k.userID, Target: t.meta[k], Minutes: minutes})
		}
	}
	t.touched = make(map[key]bool)
	return out
}

// restore devolve o tempo que não conseguiu ser gravado, para ir no próximo flush.
func (t *tracker) restore(d Drained) {
	k := keyOf(d.UserID, d.Target)
	t.pending[k] += time.Duration(d.Minutes) * time.Minute
	t.meta[k] = d.Target
	t.touched[k] = true
}
