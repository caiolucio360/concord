package liveobs

import (
	"context"
	"fmt"
	"time"

	"gin-quickstart/backend/internal/platform/hoststats"
	"gin-quickstart/backend/internal/platform/promtext"
)

// collectInterval: uma coleta por minuto (a linha guardada é o minuto entre
// duas coletas). O /metrics do LiveKit tem dezenas de KB: custo desprezível.
const collectInterval = time.Minute

// MetricsSource lê o /metrics do LiveKit.
type MetricsSource func(ctx context.Context) (promtext.Metrics, error)

// HostSource: CPU e memória da máquina (hoststats.Reader).
type HostSource interface {
	Read() (hoststats.Snapshot, error)
}

type minuteStore interface {
	InsertServerMinute(ctx context.Context, m ServerMinute) error
}

// ServerCollector coleta o LiveKit e a máquina a cada minuto e grava a linha.
type ServerCollector struct {
	fetch  MetricsSource
	host   HostSource
	store  minuteStore
	now    func() time.Time
	prev   *counters
	prevAt time.Time
}

func NewServerCollector(fetch MetricsSource, host HostSource, store minuteStore) *ServerCollector {
	return &ServerCollector{fetch: fetch, host: host, store: store, now: time.Now}
}

// Run coleta até ctx acabar. Erros só vão para o log (sem LiveKit, o app segue).
func (c *ServerCollector) Run(ctx context.Context) {
	every(ctx, collectInterval, "coleta do LiveKit", c.Tick)
}

// Tick faz uma coleta. A primeira (e a primeira depois de o LiveKit voltar)
// só guarda os contadores: o minuto é a diferença entre duas.
func (c *ServerCollector) Tick(ctx context.Context) error {
	at := c.now()
	host, hostErr := c.host.Read()
	metrics, err := c.fetch(ctx)
	if err != nil {
		c.prev = nil
		return c.insert(ctx, withHost(ServerMinute{Minute: at.Truncate(time.Minute)}, host, hostErr))
	}
	now := countersOf(metrics)
	prev, prevAt := c.prev, c.prevAt
	c.prev, c.prevAt = &now, at
	if prev == nil {
		return nil
	}
	row := serverMinute(*prev, now, at.Sub(prevAt).Seconds())
	row.Minute = at.Truncate(time.Minute)
	return c.insert(ctx, withHost(row, host, hostErr))
}

func (c *ServerCollector) insert(ctx context.Context, row ServerMinute) error {
	if err := c.store.InsertServerMinute(ctx, row); err != nil {
		return fmt.Errorf("gravar minuto: %w", err)
	}
	return nil
}

func withHost(row ServerMinute, host hoststats.Snapshot, err error) ServerMinute {
	if err != nil {
		return row
	}
	mem := host.MemUsedPercent
	row.HostCPUPercent, row.HostMemPercent = host.CPUPercent, &mem
	return row
}
