package level

import (
	"context"

	"gin-quickstart/backend/internal/relationship"
)

// linkResolver diz o vínculo de quem pede com cada pessoa da lista, numa
// consulta só (relationship.Repository).
type linkResolver interface {
	Of(ctx context.Context, viewerID string, userIDs []string) (map[string]relationship.Kind, error)
}

// forViewer copia as linhas (o top em cache é o mesmo para todos) e tira o @
// de quem não tem vínculo com viewerID: o ranking não vira atalho para achar a
// pessoa e chamar na DM ou pedir amizade.
func forViewer(ctx context.Context, links linkResolver, viewerID string, entries []RankingEntry) ([]RankingEntry, error) {
	ids := make([]string, len(entries))
	for i, e := range entries {
		ids[i] = e.UserID
	}
	kinds, err := links.Of(ctx, viewerID, ids)
	if err != nil {
		return nil, err
	}
	out := make([]RankingEntry, len(entries))
	for i, e := range entries {
		e.Relationship = kinds[e.UserID]
		if !e.Relationship.Linked() {
			e.Relationship = relationship.None
			e.Username = ""
		}
		out[i] = e
	}
	return out, nil
}
