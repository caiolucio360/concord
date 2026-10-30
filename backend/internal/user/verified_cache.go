package user

import (
	"context"
	"sync"
)

// verifiedCache lembra quem já confirmou o e-mail: o RequireVerified roda em
// toda rota autenticada e só o "sim" é guardado (quem não confirmou pode
// confirmar a qualquer momento pelo link). Sem TTL: trocar o e-mail chama
// Forget. A geração por conta impede que uma consulta que começou antes da
// troca grave o "sim" velho depois dela.
type verifiedCache struct {
	lookup func(ctx context.Context, id string) (bool, error)

	mu       sync.Mutex
	verified map[string]bool
	gens     map[string]uint64
}

func newVerifiedCache(lookup func(ctx context.Context, id string) (bool, error)) *verifiedCache {
	return &verifiedCache{lookup: lookup, verified: map[string]bool{}, gens: map[string]uint64{}}
}

// IsVerified: a conta confirmou o e-mail?
func (c *verifiedCache) IsVerified(ctx context.Context, id string) (bool, error) {
	c.mu.Lock()
	known, gen := c.verified[id], c.gens[id]
	c.mu.Unlock()
	if known {
		return true, nil
	}
	ok, err := c.lookup(ctx, id)
	if err != nil || !ok {
		return ok, err
	}
	c.mu.Lock()
	if c.gens[id] == gen {
		c.verified[id] = true
	}
	c.mu.Unlock()
	return true, nil
}

// Forget: a confirmação da conta pode ter mudado (e-mail trocado).
func (c *verifiedCache) Forget(id string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.verified, id)
	c.gens[id]++
}

// IsVerified: a conta confirmou o e-mail? Do cache depois do primeiro "sim".
func (r *Repository) IsVerified(ctx context.Context, id string) (bool, error) {
	return r.verified.IsVerified(ctx, id)
}

func (r *Repository) lookupVerified(ctx context.Context, id string) (bool, error) {
	var verified bool
	err := r.db.QueryRow(ctx, `SELECT email_verified_at IS NOT NULL FROM users WHERE id = $1`, id).Scan(&verified)
	return verified, err
}
