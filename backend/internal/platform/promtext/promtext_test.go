package promtext

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const sample = `# HELP livekit_packet_bytes x
# TYPE livekit_packet_bytes counter
livekit_packet_bytes{country="",direction="incoming",node_id="ND_1",node_type="SERVER",transmission="initial"} 1.5e+06
livekit_packet_bytes{country="BR",direction="incoming",node_id="ND_1",node_type="SERVER",transmission="initial"} 500
livekit_packet_bytes{country="",direction="outgoing",node_id="ND_1",node_type="SERVER",transmission="retransmit"} 20
livekit_participant_total{node_id="ND_1",node_type="SERVER"} 3
process_cpu_seconds_total 12.5
livekit_rtt_ms_sum{direction="outgoing",source="SCREEN_SHARE",type="VIDEO",country="",node_id="ND_1",node_type="SERVER"} 400
livekit_label_estranho{a="x\"y,z}",b="w"} 7
linha quebrada
livekit_nan NaN
`

func TestParseLeNomesRotulosEValores(t *testing.T) {
	m, err := Parse(strings.NewReader(sample))
	if err != nil {
		t.Fatal(err)
	}
	tests := []struct {
		name   string
		labels map[string]string
		want   float64
	}{
		{"livekit_packet_bytes", map[string]string{"direction": "incoming"}, 1_500_500},
		{"livekit_packet_bytes", map[string]string{"direction": "outgoing", "transmission": "retransmit"}, 20},
		{"livekit_participant_total", nil, 3},
		{"process_cpu_seconds_total", nil, 12.5},
		{"livekit_rtt_ms_sum", map[string]string{"source": "SCREEN_SHARE"}, 400},
		{"livekit_label_estranho", map[string]string{"a": `x"y,z}`, "b": "w"}, 7},
		{"nao_existe", nil, 0},
	}
	for _, tt := range tests {
		if got := m.Sum(tt.name, tt.labels); got != tt.want {
			t.Errorf("Sum(%s, %v) = %v, quer %v", tt.name, tt.labels, got, tt.want)
		}
	}
}

func TestParseIgnoraNaNELinhaQuebrada(t *testing.T) {
	m, err := Parse(strings.NewReader(sample))
	if err != nil {
		t.Fatal(err)
	}
	if got := m.Sum("livekit_nan", nil); got != 0 {
		t.Errorf("NaN = %v, quer 0 (ignorado)", got)
	}
	if m.Has("linha") {
		t.Error("linha quebrada virou métrica")
	}
	if !m.Has("process_cpu_seconds_total") {
		t.Error("Has não achou métrica existente")
	}
}

func TestFetchLeDoEndereco(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("livekit_room_total 2\n"))
	}))
	defer srv.Close()
	m, err := Fetch(context.Background(), srv.Client(), srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	if got := m.Sum("livekit_room_total", nil); got != 2 {
		t.Errorf("room_total = %v, quer 2", got)
	}
}

func TestFetchStatusDeErro(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()
	if _, err := Fetch(context.Background(), srv.Client(), srv.URL); !errors.Is(err, ErrStatus) {
		t.Fatalf("err = %v, quer ErrStatus", err)
	}
}

func TestFetchSemServidor(t *testing.T) {
	if _, err := Fetch(context.Background(), http.DefaultClient, "http://127.0.0.1:1/metrics"); err == nil {
		t.Fatal("quer erro sem servidor")
	}
}
