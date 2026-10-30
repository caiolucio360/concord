package permission

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestStatsCountHitsLoadsAndInvalidations(t *testing.T) {
	store := newCountingStore(serverWithMember("ana"))
	svc := NewService(store)
	ctx := context.Background()

	for range 3 {
		_, _ = svc.Snapshot(ctx, "s1") // 1 ida ao banco + 2 acertos
	}
	svc.InvalidateServer("s1")
	_, _ = svc.Snapshot(ctx, "s1") // ida ao banco de novo

	got := svc.Stats()
	want := CacheStats{Hits: 2, Loads: 2, Invalidations: 1, Servers: 1}
	if got != want {
		t.Fatalf("Stats = %+v, queria %+v", got, want)
	}
}

func TestStatsCountReadersThatShareALoad(t *testing.T) {
	store := newCountingStore(serverWithMember("ana"))
	store.gate = make(chan struct{})
	store.started = make(chan struct{}, 10)
	svc := NewService(store)

	var wg sync.WaitGroup
	for range 3 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _ = svc.Snapshot(context.Background(), "s1")
		}()
	}
	<-store.started
	for svc.Stats().Shared < 2 { // os outros dois chegam e esperam
		time.Sleep(time.Millisecond)
	}
	close(store.gate)
	wg.Wait()

	if got := svc.Stats(); got.Loads != 1 || got.Shared != 2 {
		t.Fatalf("Stats = %+v, queria 1 ida ao banco e 2 caronas", got)
	}
}

func TestStatsLineShowsTheIntervalAndHitRatio(t *testing.T) {
	prev := CacheStats{Hits: 100, Loads: 10, Shared: 1, Invalidations: 2}
	cur := CacheStats{Hits: 1090, Loads: 20, Shared: 3, Invalidations: 7, Servers: 4}

	line, ok := statsLine(prev, cur)
	if !ok {
		t.Fatal("houve movimento: queria a linha")
	}
	for _, part := range []string{"990 acertos", "10 idas ao banco", "2 caronas", "5 invalidações", "4 servidores", "98,8%"} {
		if !strings.Contains(line, part) {
			t.Fatalf("linha %q sem %q", line, part)
		}
	}
	if _, ok := statsLine(cur, cur); ok {
		t.Fatal("sem movimento: não loga")
	}
}

func TestLogStatsEveryStopsWithTheContext(t *testing.T) {
	svc := NewService(newCountingStore(serverWithMember("ana")))
	_, _ = svc.Snapshot(context.Background(), "s1")

	ctx, cancel := context.WithCancel(context.Background())
	lines := make(chan string, 4)
	done := make(chan struct{})
	go func() {
		defer close(done)
		svc.LogStatsEvery(ctx, time.Millisecond, func(format string, args ...any) {
			select {
			case lines <- format:
			default:
			}
		})
	}()
	<-lines // logou o movimento
	cancel()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("LogStatsEvery não parou com o contexto")
	}
}
