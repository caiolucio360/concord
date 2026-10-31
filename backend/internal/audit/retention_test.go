package audit

import (
	"context"
	"testing"
	"time"
)

type fakePruner struct{ before time.Time }

func (p *fakePruner) Prune(_ context.Context, before time.Time) error {
	p.before = before
	return nil
}

func TestRetentionApagaOQuePassouDe90Dias(t *testing.T) {
	now := time.Date(2026, 10, 30, 12, 0, 0, 0, time.UTC)
	p := &fakePruner{}
	r := NewRetention(p)
	r.now = func() time.Time { return now }
	if err := r.Prune(context.Background()); err != nil {
		t.Fatal(err)
	}
	if want := now.AddDate(0, 0, -90); !p.before.Equal(want) {
		t.Fatalf("apagou antes de %v, quer %v", p.before, want)
	}
}
