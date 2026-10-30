package liveobs

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotOwner: a sessão existe e é de outra pessoa (o relatório é ignorado).
var ErrNotOwner = errors.New("sessão de outra pessoa")

// TelemetryRepository: live_sessions, live_samples e live_events (migration 000173).
type TelemetryRepository struct {
	db *pgxpool.Pool
}

func NewTelemetryRepository(db *pgxpool.Pool) *TelemetryRepository {
	return &TelemetryRepository{db: db}
}

// Save grava um relatório numa transação: cria ou renova a sessão (só quem a
// criou), a amostra e os eventos; início e fim viram eventos do servidor.
func (r *TelemetryRepository) Save(ctx context.Context, userID string, rep Report) error {
	return pgx.BeginFunc(ctx, r.db, func(tx pgx.Tx) error {
		inserted, err := upsertSession(ctx, tx, userID, rep)
		if err != nil {
			return err
		}
		if err := insertSample(ctx, tx, rep.SessionID, rep.Sample); err != nil {
			return err
		}
		return insertEvents(ctx, tx, rep.SessionID, sessionEvents(rep, inserted))
	})
}

// sessionEvents: os do app, com o início (sessão nova) e o fim do servidor.
func sessionEvents(rep Report, inserted bool) []Event {
	events := rep.Events
	if inserted {
		events = append([]Event{{Type: EventStart}}, events...)
	}
	if rep.Ended {
		events = append(events, Event{Type: EventEnd})
	}
	return events
}

func nullable(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// upsertSession devolve se a sessão é nova; de outra pessoa = ErrNotOwner.
func upsertSession(ctx context.Context, tx pgx.Tx, userID string, rep Report) (bool, error) {
	c := rep.Context
	var inserted bool
	err := tx.QueryRow(ctx, `INSERT INTO live_sessions
			(id, user_id, kind, call_id, streamer_id, os, app_version, target, gpu, network, cores, ended_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CASE WHEN $12 THEN NOW() END)
		ON CONFLICT (id) DO UPDATE SET
			last_seen_at = NOW(),
			network = EXCLUDED.network,
			ended_at = COALESCE(live_sessions.ended_at, EXCLUDED.ended_at)
		WHERE live_sessions.user_id = EXCLUDED.user_id
		RETURNING (xmax = 0)`,
		rep.SessionID, userID, rep.Kind, nullable(rep.CallID), nullable(rep.StreamerID),
		c.OS, c.AppVersion, c.Target, c.GPU, c.Network, c.Cores, rep.Ended,
	).Scan(&inserted)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, ErrNotOwner
	}
	if err != nil {
		return false, fmt.Errorf("gravar live_sessions: %w", err)
	}
	return inserted, nil
}

func insertSample(ctx context.Context, tx pgx.Tx, sessionID string, s *Sample) error {
	if s == nil {
		return nil
	}
	_, err := tx.Exec(ctx, `INSERT INTO live_samples
		(session_id, seconds, codec, hardware, width, height, fps, target_height, target_fps,
		 bitrate_kbps, limitation, step, step_changes, layers, backup, loss_pct, jitter_ms, rtt_ms,
		 freezes, freeze_ms, frames_dropped, key_frames, pli, nack, transport, paused,
		 capture_fps, recv_fps, codec_ms, concealed_pct, recv_loss_pct, connect_ms)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,
		 $27,$28,$29,$30,$31,$32)`,
		sessionID, s.Seconds, s.Codec, s.Hardware, s.Width, s.Height, s.FPS, s.TargetHeight, s.TargetFPS,
		s.BitrateKbps, s.Limitation, s.Step, s.StepChanges, s.Layers, s.Backup, s.LossPct, s.JitterMs, s.RTTMs,
		s.Freezes, s.FreezeMs, s.Dropped, s.KeyFrames, s.PLI, s.NACK, s.Transport, s.Paused,
		s.CaptureFPS, s.RecvFPS, s.CodecMs, s.ConcealedPct, s.RecvLossPct, s.ConnectMs)
	if err != nil {
		return fmt.Errorf("gravar live_samples: %w", err)
	}
	return nil
}

func insertEvents(ctx context.Context, tx pgx.Tx, sessionID string, events []Event) error {
	for _, e := range events {
		if _, err := tx.Exec(ctx, `INSERT INTO live_events (session_id, type, detail) VALUES ($1, $2, $3)`,
			sessionID, e.Type, e.Detail); err != nil {
			return fmt.Errorf("gravar live_events: %w", err)
		}
	}
	return nil
}

// Prune apaga as sessões vistas pela última vez antes de before (amostras e
// eventos vão junto, por cascata).
func (r *TelemetryRepository) Prune(ctx context.Context, before time.Time) error {
	if _, err := r.db.Exec(ctx, `DELETE FROM live_sessions WHERE last_seen_at < $1`, before); err != nil {
		return fmt.Errorf("apagar live_sessions antigas: %w", err)
	}
	return nil
}
