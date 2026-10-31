package level

import (
	"context"

	"github.com/jackc/pgx/v5"
)

// queryRower é o que AddBonusXPTx precisa (uma transação ou o pool).
type queryRower interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// AddBonusXPTx soma XP sem tempo de voz (bônus de evento) dentro da transação de
// quem chama e devolve os totais atualizados.
func AddBonusXPTx(ctx context.Context, q queryRower, userID string, xp int64) (totalXP, voiceSeconds int64, err error) {
	err = q.QueryRow(ctx, `
		INSERT INTO user_levels (user_id, xp, voice_seconds)
		VALUES ($1, $2, 0)
		ON CONFLICT (user_id) DO UPDATE SET
			xp = user_levels.xp + EXCLUDED.xp,
			updated_at = NOW()
		RETURNING xp, voice_seconds`, userID, xp).Scan(&totalXP, &voiceSeconds)
	return totalXP, voiceSeconds, err
}
