package liveobs

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ServerRepository: a tabela livekit_metrics (migration 000172).
type ServerRepository struct {
	db *pgxpool.Pool
}

func NewServerRepository(db *pgxpool.Pool) *ServerRepository {
	return &ServerRepository{db: db}
}

const serverColumns = `minute, seconds, up, bytes_in, bytes_out, retransmit_bytes_out,
	packets_in, packets_out, packets_lost_in, packets_lost_out, nack, pli,
	rtt_ms, jitter_ms, quality_score, rooms, participants, tracks_in, tracks_out,
	video_tracks_in, video_tracks_out, livekit_cpu_pct, livekit_mem_mb, host_cpu_pct, host_mem_pct`

func (m *ServerMinute) fields() []any {
	return []any{&m.Minute, &m.Seconds, &m.Up, &m.BytesIn, &m.BytesOut, &m.RetransmitBytesOut,
		&m.PacketsIn, &m.PacketsOut, &m.PacketsLostIn, &m.PacketsLostOut, &m.Nack, &m.Pli,
		&m.RTTMs, &m.JitterMs, &m.QualityScore, &m.Rooms, &m.Participants, &m.TracksIn, &m.TracksOut,
		&m.VideoTracksIn, &m.VideoTracksOut, &m.LiveKitCPUPercent, &m.LiveKitMemMB, &m.HostCPUPercent, &m.HostMemPercent}
}

// InsertServerMinute grava o minuto (o mesmo minuto de novo substitui).
func (r *ServerRepository) InsertServerMinute(ctx context.Context, m ServerMinute) error {
	_, err := r.db.Exec(ctx, `INSERT INTO livekit_metrics (`+serverColumns+`)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
		ON CONFLICT (minute) DO UPDATE SET (`+serverColumns+`) = ROW(EXCLUDED.*)`, m.fields()...)
	if err != nil {
		return fmt.Errorf("inserir livekit_metrics: %w", err)
	}
	return nil
}

// ServerSeries: os minutos em [from, to), do mais antigo ao mais novo.
func (r *ServerRepository) ServerSeries(ctx context.Context, from, to time.Time) ([]ServerMinute, error) {
	rows, err := r.db.Query(ctx, `SELECT `+serverColumns+` FROM livekit_metrics
		WHERE minute >= $1 AND minute < $2 ORDER BY minute`, from, to)
	if err != nil {
		return nil, fmt.Errorf("ler livekit_metrics: %w", err)
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (ServerMinute, error) {
		var m ServerMinute
		return m, row.Scan(m.fields()...)
	})
}

// Prune apaga os minutos antes de before (retenção).
func (r *ServerRepository) Prune(ctx context.Context, before time.Time) error {
	if _, err := r.db.Exec(ctx, `DELETE FROM livekit_metrics WHERE minute < $1`, before); err != nil {
		return fmt.Errorf("apagar livekit_metrics antigos: %w", err)
	}
	return nil
}
