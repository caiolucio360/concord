package liveobs

import (
	"context"
	"errors"
	"testing"
	"time"

	"gin-quickstart/backend/internal/platform/hoststats"
	"gin-quickstart/backend/internal/platform/promtext"
)

type fakeMinutes struct {
	rows []ServerMinute
	err  error
}

func (f *fakeMinutes) InsertServerMinute(_ context.Context, m ServerMinute) error {
	f.rows = append(f.rows, m)
	return f.err
}

type fakeHost struct {
	snap hoststats.Snapshot
	err  error
}

func (f fakeHost) Read() (hoststats.Snapshot, error) { return f.snap, f.err }

type scripted struct {
	t     *testing.T
	texts []string
}

func (s *scripted) fetch(context.Context) (promtext.Metrics, error) {
	text := s.texts[0]
	s.texts = s.texts[1:]
	if text == "" {
		return nil, errors.New("livekit fora")
	}
	return parse(s.t, text), nil
}

func newCollector(t *testing.T, texts []string, host fakeHost, store *fakeMinutes) (*ServerCollector, *time.Time) {
	src := &scripted{t: t, texts: texts}
	at := time.Date(2026, 10, 29, 12, 0, 30, 0, time.UTC)
	c := NewServerCollector(src.fetch, host, store)
	c.now = func() time.Time { return at }
	return c, &at
}

func TestCollectorPrimeiraColetaSoGuarda(t *testing.T) {
	store := &fakeMinutes{}
	c, at := newCollector(t, []string{scrapeA, scrapeB}, fakeHost{}, store)
	if err := c.Tick(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(store.rows) != 0 {
		t.Fatalf("primeira coleta gravou %d linhas, quer 0 (sem intervalo)", len(store.rows))
	}
	*at = at.Add(time.Minute)
	if err := c.Tick(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(store.rows) != 1 {
		t.Fatalf("linhas = %d, quer 1", len(store.rows))
	}
	row := store.rows[0]
	if !row.Minute.Equal(time.Date(2026, 10, 29, 12, 1, 0, 0, time.UTC)) {
		t.Errorf("minuto = %v, quer 12:01 (truncado)", row.Minute)
	}
	if row.Seconds != 60 || row.BytesIn != 7_500_000 {
		t.Errorf("segundos = %v, bytes in = %d", row.Seconds, row.BytesIn)
	}
}

func TestCollectorJuntaAMaquina(t *testing.T) {
	cpu := 42.0
	store := &fakeMinutes{}
	c, at := newCollector(t, []string{scrapeA, scrapeB}, fakeHost{snap: hoststats.Snapshot{CPUPercent: &cpu, MemUsedPercent: 61}}, store)
	_ = c.Tick(context.Background())
	*at = at.Add(time.Minute)
	_ = c.Tick(context.Background())
	row := store.rows[0]
	if row.HostCPUPercent == nil || *row.HostCPUPercent != 42 || row.HostMemPercent == nil || *row.HostMemPercent != 61 {
		t.Errorf("máquina = %v / %v, quer 42 / 61", row.HostCPUPercent, row.HostMemPercent)
	}
}

func TestCollectorLiveKitForaGravaSoAMaquina(t *testing.T) {
	cpu := 10.0
	store := &fakeMinutes{}
	c, at := newCollector(t, []string{scrapeA, "", scrapeB, scrapeB}, fakeHost{snap: hoststats.Snapshot{CPUPercent: &cpu}}, store)
	for range 4 {
		_ = c.Tick(context.Background())
		*at = at.Add(time.Minute)
	}
	// coleta 1 guarda; 2 falha (linha Up=false); 3 recomeça (só guarda); 4 grava.
	if len(store.rows) != 2 {
		t.Fatalf("linhas = %d, quer 2", len(store.rows))
	}
	if store.rows[0].Up || store.rows[0].HostCPUPercent == nil {
		t.Errorf("linha com LiveKit fora: Up = %v, cpu = %v", store.rows[0].Up, store.rows[0].HostCPUPercent)
	}
	if !store.rows[1].Up || store.rows[1].BytesIn != 0 {
		t.Errorf("depois de voltar: Up = %v, bytes = %d (quer delta entre as duas iguais = 0)", store.rows[1].Up, store.rows[1].BytesIn)
	}
}

func TestCollectorMaquinaSemProc(t *testing.T) {
	store := &fakeMinutes{}
	c, at := newCollector(t, []string{scrapeA, scrapeB}, fakeHost{err: errors.New("sem /proc")}, store)
	_ = c.Tick(context.Background())
	*at = at.Add(time.Minute)
	if err := c.Tick(context.Background()); err != nil {
		t.Fatal(err)
	}
	if store.rows[0].HostCPUPercent != nil || store.rows[0].HostMemPercent != nil {
		t.Error("sem /proc a máquina deveria ficar vazia")
	}
}

func TestCollectorErroDoBanco(t *testing.T) {
	store := &fakeMinutes{err: errors.New("banco fora")}
	c, at := newCollector(t, []string{scrapeA, scrapeB}, fakeHost{}, store)
	_ = c.Tick(context.Background())
	*at = at.Add(time.Minute)
	if err := c.Tick(context.Background()); err == nil {
		t.Fatal("quer o erro do banco")
	}
}
