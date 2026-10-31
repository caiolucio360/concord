-- Objetivos dos eventos e o progresso de cada pessoa por ocorrência
-- (docs/adr/0037-objetivos-do-evento-pagos-em-transacao-unica.md).
CREATE TABLE event_objectives (
    id         UUID PRIMARY KEY,
    event_id   UUID NOT NULL REFERENCES server_events(id) ON DELETE CASCADE,
    position   SMALLINT NOT NULL,
    kind       TEXT NOT NULL CHECK (kind IN ('time', 'game')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    minutes    SMALLINT NOT NULL CHECK (minutes > 0),
    UNIQUE (event_id, position)
);

-- Uma linha por pessoa, objetivo e ocorrência: a ocorrência nova começa do zero
-- sem limpeza. completed_at marca o pagamento (feito na mesma transação).
CREATE TABLE event_objective_progress (
    objective_id  UUID NOT NULL REFERENCES event_objectives(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    occurrence_at TIMESTAMPTZ NOT NULL,
    minutes       INT NOT NULL DEFAULT 0,
    completed_at  TIMESTAMPTZ,
    xp_paid       INT NOT NULL DEFAULT 0,
    PRIMARY KEY (objective_id, user_id, occurrence_at)
);

-- Teto diário do XP pessoal que os eventos pagam (dia de Brasília).
CREATE TABLE event_xp_daily (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day     DATE NOT NULL,
    xp      INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
);
