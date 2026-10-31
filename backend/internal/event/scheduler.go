package event

import (
	"context"
	"log"
	"time"
	_ "time/tzdata" // fuso de Brasília também no Windows e em contêineres sem tzdata
)

const (
	tickEvery  = 30 * time.Second
	batchLimit = 50
	// endGrace: a ocorrência acaba 3 h depois do início; só então o evento
	// avança para a próxima (ou encerra).
	endGrace = 3 * time.Hour
)

// Notifier manda uma DM do Salinha Bot (cmd/wire_engagement.go).
type Notifier interface {
	Notify(ctx context.Context, userID, text string) error
}

// schedulerStore é o que o ticker usa do repositório.
type schedulerStore interface {
	ClaimDue(ctx context.Context, now time.Time, limit int) ([]DueReminder, error)
	Going(ctx context.Context, eventID string, occurrence time.Time) ([]string, error)
	AdvanceDue(ctx context.Context, now time.Time, grace time.Duration, loc *time.Location, limit int) (int, error)
}

// DueReminder é um aviso que já venceu, com o que a DM precisa dizer.
type DueReminder struct {
	ID            int64
	EventID       string
	ServerID      string
	ServerName    string
	ChannelName   string
	Title         string
	Occurrence    time.Time
	DueAt         time.Time
	OffsetMinutes int
}

// Scheduler manda os avisos dos eventos e avança as ocorrências que acabaram.
type Scheduler struct {
	store    schedulerStore
	notifier Notifier
	loc      *time.Location
	now      func() time.Time
}

func NewScheduler(store schedulerStore, notifier Notifier) *Scheduler {
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		log.Printf("[eventos] fuso America/Sao_Paulo indisponível, usando UTC-3: %v", err)
		loc = time.FixedZone("BRT", -3*60*60)
	}
	return &Scheduler{store: store, notifier: notifier, loc: loc, now: time.Now}
}

// Run confere os avisos a cada 30 s até o contexto acabar.
func (s *Scheduler) Run(ctx context.Context) {
	ticker := time.NewTicker(tickEvery)
	defer ticker.Stop()

	s.tick(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.tick(ctx)
		}
	}
}

// tick manda os avisos devidos e depois avança as ocorrências que acabaram
// (nessa ordem, para o "começou" sair antes de o evento virar a próxima semana).
func (s *Scheduler) tick(ctx context.Context) {
	now := s.now()
	due, err := s.store.ClaimDue(ctx, now, batchLimit)
	if err != nil {
		log.Printf("[eventos] buscar avisos devidos: %v", err)
	}
	for _, d := range due {
		s.deliver(ctx, d, now)
	}
	if _, err := s.store.AdvanceDue(ctx, now, endGrace, s.loc, batchLimit); err != nil {
		log.Printf("[eventos] avançar ocorrências: %v", err)
	}
}

// deliver manda a DM a quem confirmou; falha com uma pessoa não barra as outras.
func (s *Scheduler) deliver(ctx context.Context, d DueReminder, now time.Time) {
	if stale(d, now) {
		return
	}
	ids, err := s.store.Going(ctx, d.EventID, d.Occurrence)
	if err != nil {
		log.Printf("[eventos] quem vai no evento %s: %v", d.EventID, err)
		return
	}
	text := reminderText(d)
	for _, id := range ids {
		if err := s.notifier.Notify(ctx, id, text); err != nil {
			log.Printf("[eventos] DM do evento %s para %s: %v", d.EventID, id, err)
		}
	}
}
