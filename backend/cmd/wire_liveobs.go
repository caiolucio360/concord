package main

import (
	"context"
	"net/http"
	"time"

	"gin-quickstart/backend/internal/liveobs"
	"gin-quickstart/backend/internal/platform/hoststats"
	"gin-quickstart/backend/internal/platform/promtext"
)

// wireLiveObs: observabilidade das lives (docs/adr/0028-observabilidade-das-lives.md).
// A cada minuto, o /metrics do LiveKit (prometheus.port do LIVEKIT_CONFIG,
// só em 127.0.0.1) e o /proc da máquina viram uma linha em livekit_metrics.
// Sem o LiveKit com Prometheus, a linha sai só com a máquina (up = false).
func (a *app) wireLiveObs() {
	url := "http://127.0.0.1:" + envOr("LIVEKIT_PROMETHEUS_PORT", "6789") + "/metrics"
	client := &http.Client{Timeout: 5 * time.Second}
	fetch := func(ctx context.Context) (promtext.Metrics, error) {
		return promtext.Fetch(ctx, client, url)
	}
	servers := liveobs.NewServerRepository(a.db)
	go liveobs.NewServerCollector(fetch, hoststats.New(), servers).Run(a.ctx)
	go liveobs.NewRetention(servers).Run(a.ctx)
}
