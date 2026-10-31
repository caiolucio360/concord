package eventobjective

import (
	"context"
	"log"
	"time"

	"gin-quickstart/backend/internal/call"
)

// CallSource são as fotos das calls sem quem está AFK (call.AFK).
type CallSource interface{ CallSnapshots() []call.CallSnapshot }

// RealAccounts diz quais destes usuários são contas reais (badge.RealAccountCache).
type RealAccounts interface {
	Lookup(ctx context.Context, ids []string, now time.Time) map[string]bool
}

// GameSource diz o jogo que a pessoa joga agora ("" = nenhum; o Hub).
type GameSource interface{ GameName(userID string) string }

// Publisher manda o aviso para a pessoa (o Hub).
type Publisher interface{ SendToUser(userID string, event []byte) }

// Announcer avisa o app do XP novo e da subida de nível (level.Service).
type Announcer interface {
	Announce(userID string, totalXP, totalSeconds, xp int64, callID string, serverID *string)
}

type store interface {
	RunningRooms(ctx context.Context) ([]Room, error)
	AddMinutes(ctx context.Context, objectiveID, userID string, occurrence time.Time, minutes int) (int, error)
	Complete(ctx context.Context, p Payment) (Receipt, bool, error)
}

// Service conta o tempo dos objetivos olhando as calls das salas dos eventos e
// paga quem cumpre (docs/adr/0037-objetivos-do-evento-pagos-em-transacao-unica.md).
type Service struct {
	store   store
	calls   CallSource
	real    RealAccounts
	games   GameSource
	pub     Publisher
	level   Announcer
	tracker *tracker
	// every: de quanto em quanto tempo o Run olha as calls (tickInterval; os testes encurtam).
	every time.Duration
	// retry: pagamentos que falharam (a pessoa pode já ter saído da sala).
	retry map[key]Payment
}

func NewService(repo *Repository, calls CallSource, real RealAccounts, games GameSource, pub Publisher, level Announcer) *Service {
	return newService(repo, calls, real, games, pub, level, time.Now())
}

func newService(st store, calls CallSource, real RealAccounts, games GameSource, pub Publisher, level Announcer, start time.Time) *Service {
	return &Service{
		store: st, calls: calls, real: real, games: games, pub: pub, level: level,
		tracker: newTracker(start), every: tickInterval, retry: make(map[key]Payment),
	}
}

// Run conta o tempo dos objetivos até ctx acabar.
func (s *Service) Run(ctx context.Context) {
	ticker := time.NewTicker(s.every)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			s.tick(ctx, now)
		}
	}
}

func (s *Service) tick(ctx context.Context, now time.Time) {
	s.retryPayments(ctx)
	s.tracker.accrue(s.contributions(ctx, now), now)
	for _, d := range s.tracker.drain() {
		s.record(ctx, d)
	}
}

// contributions descobre quem pontua agora. Só consulta o banco se houver call
// de canal; sem sala de evento nas calls, ninguém soma.
func (s *Service) contributions(ctx context.Context, now time.Time) []Contribution {
	snaps := s.calls.CallSnapshots()
	if !anyChannelCall(snaps) {
		return nil
	}
	rooms, err := s.store.RunningRooms(ctx)
	if err != nil {
		log.Printf("[eventobjective] salas: %v", err)
		return nil
	}
	byChannel := make(map[string]Room, len(rooms))
	for _, r := range rooms {
		byChannel[r.ChannelID] = r
	}
	people := voicePeople(snaps, byChannel)
	if len(people) == 0 {
		return nil
	}
	return Contributions(snaps, byChannel, s.real.Lookup(ctx, people, now), s.games.GameName)
}

func anyChannelCall(snaps []call.CallSnapshot) bool {
	for _, c := range snaps {
		if c.ChannelID != nil {
			return true
		}
	}
	return false
}

// voicePeople: quem está em Voice nas calls das salas de evento (sem repetir).
func voicePeople(snaps []call.CallSnapshot, rooms map[string]Room) []string {
	seen := map[string]bool{}
	var out []string
	for _, c := range snaps {
		if c.ChannelID == nil {
			continue
		}
		if _, ok := rooms[*c.ChannelID]; !ok {
			continue
		}
		for _, id := range c.Voice {
			if !seen[id] {
				seen[id] = true
				out = append(out, id)
			}
		}
	}
	return out
}

// record grava os minutos e, se a meta foi batida, paga.
func (s *Service) record(ctx context.Context, d Drained) {
	total, err := s.store.AddMinutes(ctx, d.Target.ObjectiveID, d.UserID, d.Target.Occurrence, d.Minutes)
	if err != nil {
		log.Printf("[eventobjective] gravar minutos: %v", err)
		s.tracker.restore(d)
		return
	}
	if total < d.Target.Minutes {
		s.send(d.UserID, ProgressEvent{
			ServerID: d.Target.ServerID, EventID: d.Target.EventID,
			ObjectiveID: d.Target.ObjectiveID, Minutes: total,
		})
		return
	}
	s.pay(ctx, Payment{UserID: d.UserID, Target: d.Target}, total)
}

// pay tenta pagar; se falhar, guarda para repetir no próximo tick.
func (s *Service) pay(ctx context.Context, p Payment, minutes int) {
	rec, paid, err := s.store.Complete(ctx, p)
	k := keyOf(p.UserID, p.Target)
	if err != nil {
		log.Printf("[eventobjective] pagar: %v", err)
		s.retry[k] = p
		return
	}
	delete(s.retry, k)
	if !paid {
		return
	}
	if rec.Personal > 0 {
		serverID := p.Target.ServerID
		s.level.Announce(p.UserID, rec.TotalXP, rec.VoiceSeconds, rec.Personal, p.Target.CallID, &serverID)
	}
	s.send(p.UserID, ProgressEvent{
		ServerID: p.Target.ServerID, EventID: p.Target.EventID, ObjectiveID: p.Target.ObjectiveID,
		Minutes: minutes, Done: true, XP: rec.Personal, Capped: rec.Capped,
	})
}

func (s *Service) retryPayments(ctx context.Context) {
	for _, p := range s.retry {
		s.pay(ctx, p, p.Target.Minutes)
	}
}

func (s *Service) send(userID string, ev ProgressEvent) {
	s.pub.SendToUser(userID, marshalEvent("event:objective", ev))
}
