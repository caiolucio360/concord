package level

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func LevelRepository(db *pgxpool.Pool) *Repository {
	return &Repository{
		db: db,
	}
}

// AddCallMinutes soma `minutes` minutos de call de hoje (`day`, dia de
// Brasília) e o XP que eles rendem com o cansaço diário. Devolve o XP somado
// e os totais atualizados. A linha fica travada durante a conta, então dois
// ticks ao mesmo tempo não contam o mesmo cansaço duas vezes.
func (r *Repository) AddCallMinutes(ctx context.Context, userID string, day time.Time, minutes int64) (Added, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return Added{}, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(
		ctx,
		`INSERT INTO user_levels (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
		userID,
	); err != nil {
		return Added{}, err
	}

	var dailySeconds int64
	if err := tx.QueryRow(
		ctx,
		`
		SELECT CASE WHEN daily_date = $2 THEN daily_seconds ELSE 0 END
		FROM user_levels
		WHERE user_id = $1
		FOR UPDATE
		`,
		userID,
		day,
	).Scan(&dailySeconds); err != nil {
		return Added{}, err
	}

	added := Added{XP: XPForMinutes(dailySeconds/60, minutes)}
	if err := tx.QueryRow(
		ctx,
		`
		UPDATE user_levels SET
			xp = xp + $2,
			voice_seconds = voice_seconds + $3,
			daily_date = $4,
			daily_seconds = $5,
			updated_at = NOW()
		WHERE user_id = $1
		RETURNING xp, voice_seconds, daily_seconds
		`,
		userID,
		added.XP,
		minutes*60,
		day,
		dailySeconds+minutes*60,
	).Scan(&added.TotalXP, &added.TotalSeconds, &added.DailySeconds); err != nil {
		return Added{}, err
	}

	return added, tx.Commit(ctx)
}

// FindByUserIDs devolve o progresso de cada usuário (com o tempo de call de
// `day`); quem nunca ganhou XP fica no nível 1.
func (r *Repository) FindByUserIDs(ctx context.Context, userIDs []string, day time.Time) (map[string]Progress, error) {
	result := make(map[string]Progress, len(userIDs))
	for _, id := range userIDs {
		result[id] = newProgress(id, 0, 0, 0)
	}

	rows, err := r.db.Query(
		ctx,
		`
		SELECT user_id, xp, voice_seconds, CASE WHEN daily_date = $2 THEN daily_seconds ELSE 0 END
		FROM user_levels
		WHERE user_id = ANY($1::uuid[])
		`,
		userIDs,
		day,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		var xp, seconds, daily int64
		if err := rows.Scan(&id, &xp, &seconds, &daily); err != nil {
			return nil, err
		}
		result[id] = newProgress(id, xp, seconds, daily)
	}
	return result, rows.Err()
}
