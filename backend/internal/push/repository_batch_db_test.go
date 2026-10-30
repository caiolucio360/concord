package push

import (
	"context"
	"os"
	"reflect"
	"sort"
	"testing"

	"gin-quickstart/backend/internal/platform/database"

	"github.com/google/uuid"
)

// Num Postgres de verdade (TEST_DATABASE_URL): os tokens de várias pessoas
// numa consulta, cada um com a pessoa certa.
func TestDBTokensForUsers(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL não definido")
	}
	db, err := database.Connect(url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(db.Close)
	if err := database.Migrate(db, "../../migrations"); err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	newUser := func() string {
		id := uuid.NewString()
		if _, err := db.Exec(ctx, `INSERT INTO users (id, username, display_name, email, password_hash) VALUES ($1, $2::text, $2::text, $2::text || '@ex.com', 'x')`, id, "p"+id[:8]); err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { db.Exec(ctx, `DELETE FROM users WHERE id = $1`, id) })
		return id
	}
	ana, bia, caio := newUser(), newUser(), newUser()
	repo := NewRepository(db)
	for _, tk := range []struct{ user, token string }{{ana, "a1-" + ana}, {ana, "a2-" + ana}, {bia, "b1-" + bia}} {
		if err := repo.Upsert(ctx, tk.user, tk.token, "android"); err != nil {
			t.Fatal(err)
		}
	}

	got, err := repo.TokensForUsers(ctx, []string{ana, bia, caio})
	if err != nil {
		t.Fatal(err)
	}
	sort.Strings(got[ana])
	want := map[string][]string{ana: {"a1-" + ana, "a2-" + ana}, bia: {"b1-" + bia}}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("TokensForUsers = %v, queria %v", got, want)
	}
}
