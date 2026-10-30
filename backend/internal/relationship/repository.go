package relationship

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Of devolve o vínculo de viewerID com cada um de userIDs numa consulta só
// (o ranking pede 100 de uma vez). Quem não aparece no mapa não tem vínculo.
func (r *Repository) Of(ctx context.Context, viewerID string, userIDs []string) (map[string]Kind, error) {
	out := make(map[string]Kind, len(userIDs))
	rows, err := r.db.Query(
		ctx,
		`
		SELECT t.id::text,
			CASE
				WHEN t.id = $1::uuid THEN 'self'
				WHEN EXISTS (
					SELECT 1 FROM friendships f
					WHERE f.status = 'accepted'
					  AND ((f.requester_id = $1::uuid AND f.addressee_id = t.id)
					    OR (f.requester_id = t.id AND f.addressee_id = $1::uuid))
				) THEN 'friend'
				WHEN EXISTS (
					SELECT 1 FROM server_members a
					JOIN server_members b ON b.server_id = a.server_id
					WHERE a.user_id = $1::uuid AND b.user_id = t.id
				) THEN 'shared_server'
				ELSE 'none'
			END
		FROM unnest($2::uuid[]) AS t(id)
		`,
		viewerID,
		userIDs,
	)
	if err != nil {
		return nil, fmt.Errorf("vínculos: %w", err)
	}
	var id string
	var kind Kind
	_, err = pgx.ForEachRow(rows, []any{&id, &kind}, func() error {
		out[id] = kind
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("vínculos: %w", err)
	}
	return out, nil
}

// Between é o vínculo de viewerID com uma pessoa (cartão de perfil).
func (r *Repository) Between(ctx context.Context, viewerID, userID string) (Kind, error) {
	if viewerID == userID {
		return Self, nil
	}
	kinds, err := r.Of(ctx, viewerID, []string{userID})
	if err != nil {
		return None, err
	}
	if k, ok := kinds[userID]; ok {
		return k, nil
	}
	return None, nil
}
