package liveobs

import (
	"context"
	"errors"
	"log"
	"time"
)

// Retenção: séries do LiveKit e telemetria das lives ficam 14 dias.
const (
	retentionWindow   = 14 * 24 * time.Hour
	retentionInterval = time.Hour
)

// Pruner apaga o que é anterior a before.
type Pruner interface {
	Prune(ctx context.Context, before time.Time) error
}

// Retention apaga, de hora em hora, o que passou da janela em cada tabela.
type Retention struct {
	pruners []Pruner
	now     func() time.Time
}

func NewRetention(pruners ...Pruner) *Retention {
	return &Retention{pruners: pruners, now: time.Now}
}

// Run apaga já no boot e depois a cada hora, até ctx acabar.
func (r *Retention) Run(ctx context.Context) {
	if err := r.Prune(ctx); err != nil {
		log.Printf("[liveobs] retenção: %v", err)
	}
	every(ctx, retentionInterval, "retenção", r.Prune)
}

// Prune roda todos (um erro não impede os outros) e devolve os erros juntos.
func (r *Retention) Prune(ctx context.Context) error {
	before := r.now().Add(-retentionWindow)
	var errs []error
	for _, p := range r.pruners {
		errs = append(errs, p.Prune(ctx, before))
	}
	return errors.Join(errs...)
}
