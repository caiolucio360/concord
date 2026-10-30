package relationship

import (
	"context"
	"os"
	"strings"
	"testing"

	"gin-quickstart/backend/internal/platform/database"

	"github.com/google/uuid"
)

// Vínculo num Postgres de verdade (TEST_DATABASE_URL, banco descartável).
func TestRepositoryDB(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL não definido")
	}
	ctx := context.Background()
	db, err := database.Connect(url)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if err := database.Migrate(db, "../../migrations"); err != nil {
		t.Fatal(err)
	}

	mkUser := func(label string) string {
		id := uuid.NewString()
		name := label + strings.ReplaceAll(id, "-", "")[:10]
		if _, err := db.Exec(ctx, `INSERT INTO users (id, username, display_name, email, password_hash) VALUES ($1, $2::text, $2::text, $2::text || '@ex.com', 'x')`, id, name); err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { db.Exec(ctx, `DELETE FROM users WHERE id = $1`, id) })
		return id
	}
	friendship := func(a, b, status string) {
		if _, err := db.Exec(ctx, `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1, $2, $3)`, a, b, status); err != nil {
			t.Fatal(err)
		}
	}
	mkServer := func(owner string, members ...string) {
		id := uuid.NewString()
		if _, err := db.Exec(ctx, `INSERT INTO servers (id, name, owner_id) VALUES ($1, 'S', $2)`, id, owner); err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { db.Exec(ctx, `DELETE FROM servers WHERE id = $1`, id) })
		for _, m := range append([]string{owner}, members...) {
			if _, err := db.Exec(ctx, `INSERT INTO server_members (server_id, user_id) VALUES ($1, $2)`, id, m); err != nil {
				t.Fatal(err)
			}
		}
	}

	eu := mkUser("eu")
	amigo := mkUser("amigo")     // amizade aceita (eu pedi)
	amigaDela := mkUser("amiga") // amizade aceita (ela pediu)
	pendente := mkUser("pend")   // pedido ainda não aceito
	colega := mkUser("colega")   // mesmo servidor
	estranho := mkUser("estr")   // em outro servidor, sem amizade
	friendship(eu, amigo, "accepted")
	friendship(amigaDela, eu, "accepted")
	friendship(eu, pendente, "pending")
	mkServer(eu, colega)
	mkServer(estranho, pendente)

	repo := NewRepository(db)
	got, err := repo.Of(ctx, eu, []string{eu, amigo, amigaDela, pendente, colega, estranho})
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]Kind{eu: Self, amigo: Friend, amigaDela: Friend, pendente: None, colega: SharedServer, estranho: None}
	for id, k := range want {
		if got[id] != k {
			t.Errorf("vínculo com %s = %q, quer %q", id, got[id], k)
		}
	}

	if k, err := repo.Between(ctx, eu, colega); err != nil || k != SharedServer {
		t.Errorf("Between(colega) = %q, %v", k, err)
	}
	if k, err := repo.Between(ctx, eu, estranho); err != nil || k != None {
		t.Errorf("Between(estranho) = %q, %v", k, err)
	}
	if got, err := repo.Of(ctx, eu, nil); err != nil || len(got) != 0 {
		t.Errorf("Of(vazio) = %v, %v", got, err)
	}
}

// A própria pessoa não precisa de banco.
func TestBetweenSiMesmoSemBanco(t *testing.T) {
	var repo *Repository
	if k, err := repo.Between(context.Background(), "a", "a"); err != nil || k != Self {
		t.Errorf("Between(a, a) = %q, %v", k, err)
	}
}
