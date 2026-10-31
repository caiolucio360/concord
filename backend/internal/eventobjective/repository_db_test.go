package eventobjective

import (
	"context"
	"os"
	"testing"
	"time"

	"gin-quickstart/backend/internal/platform/database"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Estes testes rodam num Postgres de verdade (TEST_DATABASE_URL, banco
// descartável e já migrado) e cobrem o SQL dos objetivos e do pagamento.

func testDB(t *testing.T) (*pgxpool.Pool, context.Context) {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL não definido")
	}
	db, err := database.Connect(url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(db.Close)
	return db, context.Background()
}

func mustExec(t *testing.T, db *pgxpool.Pool, sql string, args ...any) {
	t.Helper()
	if _, err := db.Exec(context.Background(), sql, args...); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
}

// seedEvent cria uma pessoa, um servidor dela (membro) e um evento; devolve os ids.
func seedEvent(t *testing.T, db *pgxpool.Pool) (userID, serverID, eventID string) {
	t.Helper()
	userID, serverID, eventID = uuid.NewString(), uuid.NewString(), uuid.NewString()
	// Conta real (e-mail confirmado): o XP do servidor só soma para elas (ADR 0016).
	mustExec(t, db, `INSERT INTO users (id, username, display_name, email, password_hash, email_verified_at)
		VALUES ($1, $2, $2, $3, 'x', NOW())`,
		userID, "u"+userID[:8], userID[:8]+"@teste.dev")
	mustExec(t, db, `INSERT INTO servers (id, name, owner_id) VALUES ($1, $2, $3)`, serverID, "S"+serverID[:8], userID)
	mustExec(t, db, `INSERT INTO server_members (server_id, user_id) VALUES ($1, $2)`, serverID, userID)
	mustExec(t, db, `INSERT INTO server_events (id, server_id, scope, title, starts_at, next_start_at,
			duration_minutes, recurrence, occurrences_done, reminder_offsets, created_by)
		VALUES ($1, $2, 'server', 'Noite', NOW(), NOW(), 120, 'none', 0, '{}', $3)`, eventID, serverID, userID)
	t.Cleanup(func() {
		mustExec(t, db, `DELETE FROM servers WHERE id = $1`, serverID)
		mustExec(t, db, `DELETE FROM users WHERE id = $1`, userID)
	})
	return userID, serverID, eventID
}

func replace(t *testing.T, db *pgxpool.Pool, eventID string, in []Input) {
	t.Helper()
	ctx := context.Background()
	if err := pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error { return ReplaceTx(ctx, tx, eventID, in) }); err != nil {
		t.Fatal(err)
	}
}

func mustLoad(t *testing.T, db *pgxpool.Pool, userID string, refs []EventRef) []Objective {
	t.Helper()
	got, err := LoadFor(context.Background(), db, userID, refs)
	if err != nil {
		t.Fatal(err)
	}
	return got[refs[0].EventID]
}

func TestReplaceAndLoadObjectives(t *testing.T) {
	db, ctx := testDB(t)
	userID, _, eventID := seedEvent(t, db)
	occ := time.Now().UTC().Truncate(time.Second)
	refs := []EventRef{{eventID, occ}}

	replace(t, db, eventID, []Input{{KindTime, Easy, 30}, {KindGame, Hard, 60}})
	list := mustLoad(t, db, userID, refs)
	if len(list) != 2 || list[0].Kind != KindTime || list[0].XP != 1000 || list[1].Difficulty != Hard || list[1].XP != 6000 {
		t.Fatalf("objetivos = %+v", list)
	}
	if list[0].MyMinutes != 0 || list[0].MyDone {
		t.Errorf("sem progresso ainda: %+v", list[0])
	}

	// Trocar o conjunto troca tudo (e some o antigo).
	replace(t, db, eventID, []Input{{KindTime, Medium, 15}})
	if list := mustLoad(t, db, userID, refs); len(list) != 1 || list[0].Difficulty != Medium {
		t.Fatalf("depois de trocar = %+v", list)
	}
	replace(t, db, eventID, nil)
	got, err := LoadFor(ctx, db, userID, refs)
	if err != nil || len(got[eventID]) != 0 {
		t.Errorf("sem objetivos deveria vir vazio: %+v (%v)", got[eventID], err)
	}
}

func TestLoadForWithoutRefsOrUser(t *testing.T) {
	db, ctx := testDB(t)
	if got, err := LoadFor(ctx, db, "x", nil); err != nil || len(got) != 0 {
		t.Fatalf("sem eventos: %+v (%v)", got, err)
	}
	_, _, eventID := seedEvent(t, db)
	replace(t, db, eventID, []Input{{KindTime, Easy, 15}})
	got, err := LoadFor(ctx, db, "", []EventRef{{eventID, time.Now()}})
	if err != nil || len(got[eventID]) != 1 || got[eventID][0].MyMinutes != 0 {
		t.Fatalf("sem pessoa: %+v (%v)", got, err)
	}
}

func TestAddMinutesAccumulatesPerOccurrence(t *testing.T) {
	db, ctx := testDB(t)
	repo := NewRepository(db)
	userID, _, eventID := seedEvent(t, db)
	replace(t, db, eventID, []Input{{KindTime, Easy, 30}})
	occ := time.Now().UTC().Truncate(time.Second)
	refs := []EventRef{{eventID, occ}}
	objID := mustLoad(t, db, userID, refs)[0].ID

	if total, err := repo.AddMinutes(ctx, objID, userID, occ, 2); err != nil || total != 2 {
		t.Fatalf("total = %d (%v), esperava 2", total, err)
	}
	if total, err := repo.AddMinutes(ctx, objID, userID, occ, 3); err != nil || total != 5 {
		t.Fatalf("total = %d (%v), esperava 5", total, err)
	}
	if got := mustLoad(t, db, userID, refs)[0]; got.MyMinutes != 5 {
		t.Errorf("my_minutes = %d", got.MyMinutes)
	}
	// Outra ocorrência começa do zero.
	next := occ.Add(7 * 24 * time.Hour)
	if total, _ := repo.AddMinutes(ctx, objID, userID, next, 1); total != 1 {
		t.Errorf("ocorrência nova deveria somar do zero, total = %d", total)
	}
	if got := mustLoad(t, db, userID, []EventRef{{eventID, next}})[0]; got.MyMinutes != 1 {
		t.Errorf("my_minutes da ocorrência nova = %d", got.MyMinutes)
	}
}
