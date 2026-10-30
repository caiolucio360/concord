package user

import (
	"context"
	"os"
	"testing"

	"gin-quickstart/backend/internal/platform/database"

	"github.com/google/uuid"
)

// Num Postgres de verdade (TEST_DATABASE_URL, banco descartável): o "sim"
// guardado some quando a conta troca de e-mail.
func TestDBChangingEmailForgetsVerified(t *testing.T) {
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
	id := uuid.NewString()
	name := "v" + id[:8]
	if _, err := db.Exec(ctx, `INSERT INTO users (id, username, display_name, email, password_hash, email_verified_at) VALUES ($1, $2::text, $2::text, $2::text || '@ex.com', 'x', NOW())`, id, name); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Exec(ctx, `DELETE FROM users WHERE id = $1`, id) })

	repo := UserRepository(db)
	if ok, err := repo.IsVerified(ctx, id); err != nil || !ok {
		t.Fatalf("IsVerified = %v, %v", ok, err)
	}
	if _, err := repo.SetEmail(ctx, id, name+"@outro.com", false); err != nil {
		t.Fatal(err)
	}
	if ok, err := repo.IsVerified(ctx, id); err != nil || ok {
		t.Fatalf("depois de trocar o e-mail: IsVerified = %v, %v", ok, err)
	}
}
