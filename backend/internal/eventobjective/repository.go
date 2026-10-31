package eventobjective

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Execer: o que ReplaceTx precisa da transação (ou do pool).
type Execer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// Querier: o que LoadFor precisa para ler.
type Querier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

// ReplaceTx troca o conjunto de objetivos do evento (dentro da transação que
// grava o evento). Objetivo novo ganha id novo; o progresso antigo vai junto
// (ON DELETE CASCADE): só dá para editar antes de o evento começar.
func ReplaceTx(ctx context.Context, tx Execer, eventID string, in []Input) error {
	if _, err := tx.Exec(ctx, `DELETE FROM event_objectives WHERE event_id = $1`, eventID); err != nil {
		return err
	}
	for i, o := range in {
		if _, err := tx.Exec(ctx, `
			INSERT INTO event_objectives (id, event_id, position, kind, difficulty, minutes)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			uuid.NewString(), eventID, i, string(o.Kind), string(o.Difficulty), o.Minutes); err != nil {
			return err
		}
	}
	return nil
}

// EventRef é um evento e a ocorrência cujo progresso interessa.
type EventRef struct {
	EventID    string
	Occurrence time.Time
}

// LoadFor lê os objetivos dos eventos, na ordem em que foram cadastrados, com
// o progresso de userID na ocorrência pedida (userID vazio = sem progresso).
func LoadFor(ctx context.Context, q Querier, userID string, refs []EventRef) (map[string][]Objective, error) {
	out := make(map[string][]Objective, len(refs))
	if len(refs) == 0 {
		return out, nil
	}
	ids := make([]string, len(refs))
	occs := make([]time.Time, len(refs))
	for i, r := range refs {
		ids[i], occs[i] = r.EventID, r.Occurrence
	}
	var user any
	if userID != "" {
		user = userID
	}
	rows, err := q.Query(ctx, `
		SELECT o.event_id, o.id, o.kind, o.difficulty, o.minutes,
		       COALESCE(p.minutes, 0), p.completed_at IS NOT NULL
		FROM unnest($1::uuid[], $3::timestamptz[]) AS ev(id, occ)
		JOIN event_objectives o ON o.event_id = ev.id
		LEFT JOIN event_objective_progress p
		       ON p.objective_id = o.id AND p.user_id = $2::uuid AND p.occurrence_at = ev.occ
		ORDER BY o.event_id, o.position`, ids, user, occs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var eventID, kind, difficulty string
		var o Objective
		if err := rows.Scan(&eventID, &o.ID, &kind, &difficulty, &o.Minutes, &o.MyMinutes, &o.MyDone); err != nil {
			return nil, err
		}
		o.Kind, o.Difficulty = Kind(kind), Difficulty(difficulty)
		o.XP = PersonalXP(o.Difficulty)
		out[eventID] = append(out[eventID], o)
	}
	return out, rows.Err()
}

// AddMinutes soma minutos ao progresso da pessoa na ocorrência e devolve o total.
func (r *Repository) AddMinutes(ctx context.Context, objectiveID, userID string, occurrence time.Time, minutes int) (int, error) {
	var total int
	err := r.db.QueryRow(ctx, `
		INSERT INTO event_objective_progress (objective_id, user_id, occurrence_at, minutes)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (objective_id, user_id, occurrence_at)
		DO UPDATE SET minutes = event_objective_progress.minutes + EXCLUDED.minutes
		RETURNING minutes`, objectiveID, userID, occurrence, minutes).Scan(&total)
	return total, err
}
