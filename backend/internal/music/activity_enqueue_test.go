package music

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
)

func replyText(t *testing.T, err error) string {
	t.Helper()
	var re ReplyError
	if !errors.As(err, &re) {
		t.Fatalf("err = %v, want ReplyError", err)
	}
	return re.Text
}

func TestEnqueueQueryAddsFirstSearchResult(t *testing.T) {
	m, hub := newTestManager(t, true, true)
	if err := m.EnqueueQuery(context.Background(), "u1", "srv1", "Queen - Bohemian Rhapsody"); err != nil {
		t.Fatalf("err = %v", err)
	}
	if got := hub.publics(); len(got) != 1 || got[0] != TextAddedNow("caio", "Bohemian Rhapsody", 355_000, "Sala 1") {
		t.Fatalf("público = %v", got)
	}
	eventually(t, "music:state", func() bool { return hub.last("music:state") != nil })
}

func TestEnqueueQueryGuards(t *testing.T) {
	t.Run("fora da voz", func(t *testing.T) {
		m, _ := newTestManager(t, false, true)
		err := m.EnqueueQuery(context.Background(), "u1", "srv1", "queen")
		if got := replyText(t, err); got != TextNotInVoice {
			t.Fatalf("texto = %q", got)
		}
	})
	t.Run("voz em outro servidor", func(t *testing.T) {
		m, _ := newTestManager(t, true, true)
		err := m.EnqueueQuery(context.Background(), "u1", "outro", "queen")
		if got := replyText(t, err); got != TextNotInVoice {
			t.Fatalf("texto = %q", got)
		}
	})
	t.Run("maestro removido", func(t *testing.T) {
		m, _ := newTestManager(t, true, false)
		err := m.EnqueueQuery(context.Background(), "u1", "srv1", "queen")
		if got := replyText(t, err); got != TextBotRemoved {
			t.Fatalf("texto = %q", got)
		}
	})
	t.Run("indisponível", func(t *testing.T) {
		m, _ := newTestManager(t, true, true)
		m.available = false
		err := m.EnqueueQuery(context.Background(), "u1", "srv1", "queen")
		if got := replyText(t, err); got != TextUnavailable {
			t.Fatalf("texto = %q", got)
		}
	})
}

func TestEnqueueQueryRejectsBadQuery(t *testing.T) {
	m, hub := newTestManager(t, true, true)
	for _, q := range []string{"", "   ", strings.Repeat("a", queryMax+1)} {
		if err := m.EnqueueQuery(context.Background(), "u1", "srv1", q); !errors.Is(err, ErrInvalidQuery) {
			t.Errorf("%q → %v, want ErrInvalidQuery", q, err)
		}
	}
	if len(hub.publics()) != 0 {
		t.Fatalf("nada deveria entrar na fila: %v", hub.publics())
	}
}

type emptySearch struct{ mgrSource }

func (*emptySearch) Search(context.Context, string, int) ([]Track, error) { return nil, nil }

func TestEnqueueQueryWithoutResults(t *testing.T) {
	m, _ := newTestManager(t, true, true)
	m.deps.Source = &emptySearch{mgrSource{fakeSource{fail: map[string]bool{}}}}
	err := m.EnqueueQuery(context.Background(), "u1", "srv1", "xyzzy")
	if got := replyText(t, err); got != TextSearchEmpty("xyzzy") {
		t.Fatalf("texto = %q", got)
	}
}

type longFirstSearch struct{ mgrSource }

func (*longFirstSearch) Search(context.Context, string, int) ([]Track, error) {
	return []Track{
		{VideoID: "longoxxxxxx", Title: "Mix de 10h", DurationMs: maxVideoMs + 1},
		{VideoID: "aovivoxxxxx", Title: "Ao vivo", IsLive: true},
		{VideoID: "dQw4w9WgXcQ", Title: "Never", DurationMs: 213_000},
	}, nil
}

func TestEnqueueQuerySkipsLiveAndTooLongResults(t *testing.T) {
	m, hub := newTestManager(t, true, true)
	m.deps.Source = &longFirstSearch{mgrSource{fakeSource{fail: map[string]bool{}}}}
	if err := m.EnqueueQuery(context.Background(), "u1", "srv1", "never gonna"); err != nil {
		t.Fatalf("err = %v", err)
	}
	if got := hub.publics(); len(got) != 1 {
		t.Fatalf("público = %v", got)
	}
}

func TestEnqueueQueryResolveFailureIsReplied(t *testing.T) {
	m, _ := newTestManager(t, true, true)
	m.deps.Source = &privateSearch{mgrSource{fakeSource{fail: map[string]bool{}}}}
	err := m.EnqueueQuery(context.Background(), "u1", "srv1", "segredo")
	if got := replyText(t, err); got != TextPrivate {
		t.Fatalf("texto = %q", got)
	}
}

type privateSearch struct{ mgrSource }

func (*privateSearch) Search(context.Context, string, int) ([]Track, error) {
	return []Track{{VideoID: "privadoxxxx", Title: "x", DurationMs: 1000}}, nil
}

func TestEnqueueQueryOneAtATimePerUser(t *testing.T) {
	m, hub := newTestManager(t, true, true)
	release := make(chan struct{})
	resolves := 0
	var mu sync.Mutex
	m.deps.Source = &blockingSource{mgrSource: mgrSource{fakeSource{fail: map[string]bool{}}}, release: release, mu: &mu, n: &resolves}
	done := make(chan error, 1)
	go func() { done <- m.EnqueueQuery(context.Background(), "u1", "srv1", "queen") }()
	eventually(t, "resolve em andamento", func() bool { mu.Lock(); defer mu.Unlock(); return resolves == 1 })
	if err := m.EnqueueQuery(context.Background(), "u1", "srv1", "queen"); !errors.Is(err, ErrBusy) {
		t.Fatalf("2º pedido = %v, want ErrBusy", err)
	}
	close(release)
	if err := <-done; err != nil {
		t.Fatalf("1º pedido = %v", err)
	}
	if len(hub.publics()) != 1 {
		t.Fatalf("publics = %v", hub.publics())
	}
}
