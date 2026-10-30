-- Telemetria das lives e calls (internal/liveobs, ADR 0029): o app manda, a
-- cada 20 s (lives) ou 60 s (calls), um resumo técnico do getStats() de cada
-- sessão. Só números e nomes técnicos (codec, SO, placa de vídeo), nada do que
-- se fala ou mostra. Retenção de 14 dias pelo last_seen_at (o backend apaga;
-- amostras e eventos vão junto). Apagar a conta apaga tudo.
CREATE TABLE live_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- transmite: a minha live; assiste: a live de streamer_id; call: a voz.
    kind TEXT NOT NULL CHECK (kind IN ('transmite', 'assiste', 'call')),
    call_id UUID,
    streamer_id UUID,
    os TEXT NOT NULL DEFAULT '',
    app_version TEXT NOT NULL DEFAULT '',
    target TEXT NOT NULL DEFAULT '',
    gpu TEXT NOT NULL DEFAULT '',
    network TEXT NOT NULL DEFAULT '',
    -- núcleos lógicos do processador (0 = o navegador não contou).
    cores INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);
CREATE INDEX live_sessions_last_seen_idx ON live_sessions (last_seen_at);
CREATE INDEX live_sessions_started_idx ON live_sessions (started_at DESC);
CREATE INDEX live_sessions_user_idx ON live_sessions (user_id, started_at DESC);

-- Uma leitura: contadores (freezes, dropped, key_frames, pli, nack) são a
-- diferença no intervalo de `seconds`; o resto é o valor no momento.
CREATE TABLE live_samples (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES live_sessions (id) ON DELETE CASCADE,
    at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    seconds REAL NOT NULL,
    codec TEXT NOT NULL DEFAULT '',
    -- codificador (transmite) ou decodificador (assiste) na placa de vídeo.
    hardware BOOLEAN,
    width INT,
    height INT,
    fps REAL,
    target_height INT,
    target_fps INT,
    bitrate_kbps INT,
    limitation TEXT NOT NULL DEFAULT '',
    step INT,
    step_changes INT NOT NULL DEFAULT 0,
    layers INT,
    backup BOOLEAN,
    loss_pct REAL,
    jitter_ms REAL,
    rtt_ms REAL,
    freezes INT NOT NULL DEFAULT 0,
    freeze_ms INT NOT NULL DEFAULT 0,
    frames_dropped INT NOT NULL DEFAULT 0,
    key_frames INT NOT NULL DEFAULT 0,
    pli INT NOT NULL DEFAULT 0,
    nack INT NOT NULL DEFAULT 0,
    -- udp, tcp ou relay (TURN): o par ICE escolhido.
    transport TEXT NOT NULL DEFAULT '',
    paused BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX live_samples_session_idx ON live_samples (session_id, at);

CREATE TABLE live_events (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES live_sessions (id) ON DELETE CASCADE,
    at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT ''
);
CREATE INDEX live_events_at_idx ON live_events (at DESC);
CREATE INDEX live_events_session_idx ON live_events (session_id);
