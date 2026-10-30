package liveobs

// Telemetria das lives e calls: o que o app manda (POST /api/obs/telemetry).
// Só números e nomes técnicos (ver docs/adr/0029-observabilidade-das-lives.md).

// Tipos de sessão.
const (
	KindShare = "transmite"
	KindWatch = "assiste"
	KindCall  = "call"
)

// Eventos que o app manda (os de início e fim são do servidor).
const (
	EventStart         = "inicio"
	EventEnd           = "fim"
	EventStepDown      = "degrau_caiu"
	EventStepUp        = "degrau_subiu"
	EventBackupOn      = "reserva_ligada"
	EventEncoderSW     = "encoder_software"
	EventDecoderSW     = "decoder_software"
	EventLongFreeze    = "congelamento_longo"
	EventServerPaused  = "pausada_pelo_servidor"
	EventCodecSwitched = "codec_trocou"
)

// Batch: um pedido do app, com todas as sessões ativas dele.
type Batch struct {
	Reports []Report `json:"reports"`
}

// Report: uma sessão (a minha live, uma live que assisto ou a call).
type Report struct {
	// SessionID: UUID gerado no app no começo da sessão.
	SessionID string `json:"session_id"`
	Kind      string `json:"kind"`
	CallID    string `json:"call_id"`
	// StreamerID: de quem é a live (assiste).
	StreamerID string        `json:"streamer_id"`
	Context    ClientContext `json:"context"`
	Sample     *Sample       `json:"sample"`
	Events     []Event       `json:"events"`
	// Ended: última amostra (parou de transmitir/assistir, saiu da call).
	Ended bool `json:"ended"`
}

type ClientContext struct {
	OS         string `json:"os"`
	AppVersion string `json:"app_version"`
	// Target: desktop ou web.
	Target string `json:"target"`
	// GPU: o renderer do WebGL ("ANGLE (NVIDIA, GeForce RTX 3070 ...)").
	GPU string `json:"gpu"`
	// Network: navigator.connection.effectiveType/type, quando o navegador conta.
	Network string `json:"network"`
	// Cores: núcleos lógicos do processador.
	Cores int `json:"cores"`
}

// Sample: uma leitura. Contadores = diferença no intervalo de Seconds.
type Sample struct {
	Seconds      float64  `json:"seconds"`
	Codec        string   `json:"codec"`
	Hardware     *bool    `json:"hardware"`
	Width        *int     `json:"width"`
	Height       *int     `json:"height"`
	FPS          *float64 `json:"fps"`
	TargetHeight *int     `json:"target_height"`
	TargetFPS    *int     `json:"target_fps"`
	BitrateKbps  *int     `json:"bitrate_kbps"`
	// Limitation: qualityLimitationReason (cpu, bandwidth, other, none).
	Limitation  string   `json:"limitation"`
	Step        *int     `json:"step"`
	StepChanges int      `json:"step_changes"`
	Layers      *int     `json:"layers"`
	Backup      *bool    `json:"backup"`
	LossPct     *float64 `json:"loss_pct"`
	JitterMs    *float64 `json:"jitter_ms"`
	RTTMs       *float64 `json:"rtt_ms"`
	Freezes     int      `json:"freezes"`
	FreezeMs    int      `json:"freeze_ms"`
	Dropped     int      `json:"frames_dropped"`
	KeyFrames   int      `json:"key_frames"`
	PLI         int      `json:"pli"`
	NACK        int      `json:"nack"`
	// Transport: udp, tcp ou relay (par ICE escolhido).
	Transport string `json:"transport"`
	// Paused: o servidor pausou a live (conexão fraca de quem assiste).
	Paused bool `json:"paused"`
}

type Event struct {
	Type   string `json:"type"`
	Detail string `json:"detail"`
}
