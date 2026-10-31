package level

import (
	"context"
	"os"
	"strings"
	"testing"

	"gin-quickstart/backend/internal/platform/database"

	"github.com/google/uuid"
)

// O XP de bônus (eventos) soma no nível da pessoa sem mexer no tempo de voz.
func TestAddBonusXPTxAddsXPWithoutVoiceTime(t *testing.T) {
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

	id := uuid.NewString()
	name := "bonus" + strings.ReplaceAll(id, "-", "")[:10]
	if _, err := db.Exec(ctx, `INSERT INTO users (id, username, display_name, email, password_hash) VALUES ($1, $2::text, $2::text, $2::text || '@ex.com', 'x')`, id, name); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Exec(ctx, `DELETE FROM users WHERE id = $1`, id) })

	// Quem já tem XP e tempo de voz mantém o tempo.
	if _, _, err := LevelRepository(db).AddVoiceXP(ctx, id, 100, 600); err != nil {
		t.Fatal(err)
	}
	xp, seconds, err := AddBonusXPTx(ctx, db, id, 1000)
	if err != nil || xp != 1100 || seconds != 600 {
		t.Fatalf("totais = %d XP, %d s (%v), esperava 1100 e 600", xp, seconds, err)
	}
	xp, seconds, err = AddBonusXPTx(ctx, db, id, 500)
	if err != nil || xp != 1600 || seconds != 600 {
		t.Fatalf("somou de novo: %d XP, %d s (%v)", xp, seconds, err)
	}

	// Quem nunca teve linha em user_levels ganha uma, com 0 s de voz.
	novo := uuid.NewString()
	nome := "novo" + strings.ReplaceAll(novo, "-", "")[:10]
	if _, err := db.Exec(ctx, `INSERT INTO users (id, username, display_name, email, password_hash) VALUES ($1, $2::text, $2::text, $2::text || '@ex.com', 'x')`, novo, nome); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Exec(ctx, `DELETE FROM users WHERE id = $1`, novo) })
	if xp, seconds, err := AddBonusXPTx(ctx, db, novo, 1000); err != nil || xp != 1000 || seconds != 0 {
		t.Fatalf("primeira vez: %d XP, %d s (%v)", xp, seconds, err)
	}
}
