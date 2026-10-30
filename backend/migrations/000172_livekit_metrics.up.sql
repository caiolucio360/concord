-- Métricas do LiveKit por minuto (internal/liveobs, ADR 0029): o backend lê o
-- /metrics do LiveKit (Prometheus, só em 127.0.0.1) e o /proc da máquina a
-- cada minuto e grava a diferença entre duas coletas. Contadores = no minuto;
-- salas/participantes/tracks = no fim do minuto. Retenção de 14 dias (o
-- backend apaga o que passou disso). up = false: o LiveKit não respondeu
-- (só os números da máquina).
CREATE TABLE livekit_metrics (
    minute TIMESTAMPTZ PRIMARY KEY,
    seconds REAL NOT NULL DEFAULT 0,
    up BOOLEAN NOT NULL,
    bytes_in BIGINT NOT NULL DEFAULT 0,
    bytes_out BIGINT NOT NULL DEFAULT 0,
    retransmit_bytes_out BIGINT NOT NULL DEFAULT 0,
    packets_in BIGINT NOT NULL DEFAULT 0,
    packets_out BIGINT NOT NULL DEFAULT 0,
    packets_lost_in BIGINT NOT NULL DEFAULT 0,
    packets_lost_out BIGINT NOT NULL DEFAULT 0,
    nack BIGINT NOT NULL DEFAULT 0,
    pli BIGINT NOT NULL DEFAULT 0,
    rtt_ms REAL,
    jitter_ms REAL,
    quality_score REAL,
    rooms INT NOT NULL DEFAULT 0,
    participants INT NOT NULL DEFAULT 0,
    tracks_in INT NOT NULL DEFAULT 0,
    tracks_out INT NOT NULL DEFAULT 0,
    video_tracks_in INT NOT NULL DEFAULT 0,
    video_tracks_out INT NOT NULL DEFAULT 0,
    livekit_cpu_pct REAL,
    livekit_mem_mb REAL,
    host_cpu_pct REAL,
    host_mem_pct REAL
);
