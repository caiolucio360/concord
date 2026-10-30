package liveobs

import (
	"context"
	"net/http"
	"os"
	"testing"
	"time"

	"gin-quickstart/backend/internal/platform/promtext"
)

// Contra um LiveKit de verdade (LIVEKIT_METRICS_URL=http://127.0.0.1:6789/metrics):
// os nomes que o coletor procura existem no /metrics da versão em uso.
func TestCollectorContraLiveKitDeVerdade(t *testing.T) {
	url := os.Getenv("LIVEKIT_METRICS_URL")
	if url == "" {
		t.Skip("LIVEKIT_METRICS_URL não definido")
	}
	m, err := promtext.Fetch(context.Background(), &http.Client{Timeout: 5 * time.Second}, url)
	if err != nil {
		t.Fatal(err)
	}
	// Os vetores (bytes, perda, tracks) só aparecem depois do primeiro evento;
	// estes existem desde o boot.
	for _, name := range []string{"livekit_room_total", "livekit_participant_total", "process_cpu_seconds_total", "process_resident_memory_bytes"} {
		if !m.Has(name) {
			t.Errorf("%s não está no /metrics", name)
		}
	}
	if c := countersOf(m); c.g[gRSS] <= 0 || c.c[cCPUSeconds] <= 0 {
		t.Errorf("memória/CPU do LiveKit zerados: %+v", c)
	}
}
