package user

import (
	"context"

	"gin-quickstart/backend/internal/relationship"
)

// linkResolver diz o vínculo de quem vê com a pessoa do cartão
// (relationship.Repository).
type linkResolver interface {
	Between(ctx context.Context, viewerID, userID string) (relationship.Kind, error)
}

// forViewer marca o vínculo no perfil e, sem vínculo (amizade ou servidor em
// comum), tira o @: o nome de exibição e a customização continuam, mas o
// cartão aberto pelo ranking não vira atalho para DM ou pedido de amizade.
func forViewer(p PublicProfile, k relationship.Kind) PublicProfile {
	if !k.Linked() {
		k = relationship.None
		p.Username = ""
	}
	p.Relationship = k
	return p
}
