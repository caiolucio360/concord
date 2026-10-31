package eventobjective

import (
	"context"
	"fmt"

	"gin-quickstart/backend/internal/level"

	"github.com/jackc/pgx/v5"
)

// Payment é o objetivo cumprido a pagar.
type Payment struct {
	UserID string
	Target Target
}

// Receipt é o que foi pago de fato (depois dos tetos).
type Receipt struct {
	Personal, Server int64
	// TotalXP e VoiceSeconds: os totais da pessoa depois do pagamento (para o aviso de nível).
	TotalXP, VoiceSeconds int64
	// Capped: o teto diário cortou parte do XP pessoal.
	Capped bool
}

// Complete paga o objetivo numa transação só: marca a conclusão (só um pedido
// ganha), aplica o teto pessoal do dia, soma o XP pessoal e o do servidor. O
// segundo valor é false, sem erro, se já estava pago ou a meta não foi batida.
func (r *Repository) Complete(ctx context.Context, p Payment) (Receipt, bool, error) {
	var rec Receipt
	paid := false
	err := pgx.BeginFunc(ctx, r.db, func(tx pgx.Tx) error {
		claimed, err := claim(ctx, tx, p)
		if err != nil || !claimed {
			return err
		}
		paid = true
		want := PersonalXP(p.Target.Difficulty)
		if rec.Personal, err = takeFromDailyCap(ctx, tx, p.UserID, want); err != nil {
			return err
		}
		rec.Capped = rec.Personal < want
		if err := payPersonal(ctx, tx, p.UserID, &rec); err != nil {
			return err
		}
		if err := tx.QueryRow(ctx, `SELECT server_level_add($1, $2, 'evento', $3)`,
			p.Target.ServerID, p.UserID, int(ServerXP(p.Target.Difficulty))).Scan(&rec.Server); err != nil {
			return fmt.Errorf("xp do servidor: %w", err)
		}
		_, err = tx.Exec(ctx, `UPDATE event_objective_progress SET xp_paid = $4
			WHERE objective_id = $1 AND user_id = $2 AND occurrence_at = $3`,
			p.Target.ObjectiveID, p.UserID, p.Target.Occurrence, int(rec.Personal))
		return err
	})
	if err != nil {
		return Receipt{}, false, err
	}
	return rec, paid, nil
}

// claim marca o objetivo como cumprido se a meta foi batida e ainda não estava.
func claim(ctx context.Context, tx pgx.Tx, p Payment) (bool, error) {
	tag, err := tx.Exec(ctx, `
		UPDATE event_objective_progress pr SET completed_at = NOW()
		FROM event_objectives o
		WHERE pr.objective_id = $1 AND pr.user_id = $2 AND pr.occurrence_at = $3
		  AND pr.completed_at IS NULL AND o.id = pr.objective_id AND pr.minutes >= o.minutes`,
		p.Target.ObjectiveID, p.UserID, p.Target.Occurrence)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}

// takeFromDailyCap reserva do teto pessoal do dia até `want` XP e devolve quanto coube.
func takeFromDailyCap(ctx context.Context, tx pgx.Tx, userID string, want int64) (int64, error) {
	if _, err := tx.Exec(ctx, `
		INSERT INTO event_xp_daily (user_id, day, xp) VALUES ($1, server_level_today(), 0)
		ON CONFLICT DO NOTHING`, userID); err != nil {
		return 0, err
	}
	var used int64
	if err := tx.QueryRow(ctx, `
		SELECT xp FROM event_xp_daily WHERE user_id = $1 AND day = server_level_today() FOR UPDATE`, userID).Scan(&used); err != nil {
		return 0, err
	}
	granted := min(want, max(DailyPersonalCap-used, 0))
	_, err := tx.Exec(ctx, `UPDATE event_xp_daily SET xp = xp + $2 WHERE user_id = $1 AND day = server_level_today()`,
		userID, int(granted))
	return granted, err
}

// payPersonal soma o XP pessoal (se coube algum) e guarda os totais no recibo.
func payPersonal(ctx context.Context, tx pgx.Tx, userID string, rec *Receipt) error {
	if rec.Personal == 0 {
		return nil
	}
	var err error
	rec.TotalXP, rec.VoiceSeconds, err = level.AddBonusXPTx(ctx, tx, userID, rec.Personal)
	return err
}
