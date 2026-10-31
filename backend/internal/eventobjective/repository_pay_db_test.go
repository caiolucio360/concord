package eventobjective

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// payFixture cria evento + objetivo (15 min) e deixa a pessoa com a meta batida.
func payFixture(t *testing.T, db *pgxpool.Pool, d Difficulty) (Payment, *Repository) {
	t.Helper()
	userID, serverID, eventID := seedEvent(t, db)
	occ := time.Now().UTC().Truncate(time.Second)
	replace(t, db, eventID, []Input{{KindTime, d, 15}})
	obj := mustLoad(t, db, userID, []EventRef{{eventID, occ}})[0]
	repo := NewRepository(db)
	if _, err := repo.AddMinutes(context.Background(), obj.ID, userID, occ, 15); err != nil {
		t.Fatal(err)
	}
	return Payment{UserID: userID, Target: Target{
		ObjectiveID: obj.ID, EventID: eventID, ServerID: serverID, Occurrence: occ, Minutes: 15, Difficulty: d,
	}}, repo
}

// anotherObjective põe mais um objetivo no mesmo evento, com a meta batida pela
// mesma pessoa na mesma ocorrência, e devolve o pagamento dele.
func anotherObjective(t *testing.T, db *pgxpool.Pool, first Payment, d Difficulty) Payment {
	t.Helper()
	replace(t, db, first.Target.EventID, []Input{{KindTime, Easy, 15}, {KindTime, d, 15}})
	refs := []EventRef{{first.Target.EventID, first.Target.Occurrence}}
	second := mustLoad(t, db, first.UserID, refs)[1]
	if _, err := NewRepository(db).AddMinutes(context.Background(), second.ID, first.UserID, first.Target.Occurrence, 15); err != nil {
		t.Fatal(err)
	}
	p := first
	p.Target.ObjectiveID, p.Target.Difficulty = second.ID, d
	return p
}

func personalXP(t *testing.T, db *pgxpool.Pool, userID string) int64 {
	t.Helper()
	var xp int64
	if err := db.QueryRow(context.Background(), `SELECT COALESCE((SELECT xp FROM user_levels WHERE user_id = $1), 0)`, userID).Scan(&xp); err != nil {
		t.Fatal(err)
	}
	return xp
}

func serverXP(t *testing.T, db *pgxpool.Pool, serverID string) int64 {
	t.Helper()
	var xp int64
	if err := db.QueryRow(context.Background(), `SELECT COALESCE((SELECT xp FROM server_levels WHERE server_id = $1), 0)`, serverID).Scan(&xp); err != nil {
		t.Fatal(err)
	}
	return xp
}

func completed(t *testing.T, db *pgxpool.Pool, p Payment) bool {
	t.Helper()
	var done bool
	if err := db.QueryRow(context.Background(), `
		SELECT completed_at IS NOT NULL FROM event_objective_progress
		WHERE objective_id = $1 AND user_id = $2 AND occurrence_at = $3`,
		p.Target.ObjectiveID, p.UserID, p.Target.Occurrence).Scan(&done); err != nil {
		t.Fatal(err)
	}
	return done
}

func TestCompletePaysOnceBothXPs(t *testing.T) {
	db, ctx := testDB(t)
	p, repo := payFixture(t, db, Easy)
	rec, paid, err := repo.Complete(ctx, p)
	if err != nil || !paid {
		t.Fatalf("pagou = %v (%v)", paid, err)
	}
	if rec.Personal != 1000 || rec.Server != 50 || rec.Capped || rec.TotalXP != 1000 {
		t.Errorf("recibo = %+v", rec)
	}
	if got := personalXP(t, db, p.UserID); got != 1000 {
		t.Errorf("XP pessoal = %d", got)
	}
	if got := serverXP(t, db, p.Target.ServerID); got != 50 {
		t.Errorf("XP do servidor = %d", got)
	}
	// De novo: não paga.
	if _, paid, err := repo.Complete(ctx, p); err != nil || paid {
		t.Errorf("segunda tentativa: pagou = %v (%v)", paid, err)
	}
	if got := personalXP(t, db, p.UserID); got != 1000 {
		t.Errorf("XP pessoal não pode dobrar: %d", got)
	}
}

func TestCompleteIsAtomicUnderConcurrency(t *testing.T) {
	db, ctx := testDB(t)
	p, repo := payFixture(t, db, Easy)
	var wg sync.WaitGroup
	var mu sync.Mutex
	paidCount := 0
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, paid, err := repo.Complete(ctx, p); err == nil && paid {
				mu.Lock()
				paidCount++
				mu.Unlock()
			}
		}()
	}
	wg.Wait()
	if paidCount != 1 {
		t.Fatalf("pagou %d vezes, esperava 1", paidCount)
	}
	if got := personalXP(t, db, p.UserID); got != 1000 {
		t.Errorf("XP pessoal = %d", got)
	}
}

func TestCompleteNeedsTheGoalReached(t *testing.T) {
	db, ctx := testDB(t)
	p, repo := payFixture(t, db, Easy)
	// Meta de 30 min, só 15 gravados: não paga.
	mustExec(t, db, `UPDATE event_objectives SET minutes = 30 WHERE id = $1`, p.Target.ObjectiveID)
	if _, paid, err := repo.Complete(ctx, p); err != nil || paid {
		t.Fatalf("pagou = %v (%v) sem bater a meta", paid, err)
	}
	if personalXP(t, db, p.UserID) != 0 || completed(t, db, p) {
		t.Error("sem bater a meta nada muda")
	}
}

func TestCompleteStopsAtTheDailyPersonalCap(t *testing.T) {
	db, ctx := testDB(t)
	p, repo := payFixture(t, db, Hard) // 6.000
	mustExec(t, db, `INSERT INTO event_xp_daily (user_id, day, xp) VALUES ($1, server_level_today(), 5000)`, p.UserID)
	rec, paid, err := repo.Complete(ctx, p)
	if err != nil || !paid {
		t.Fatalf("pagou = %v (%v)", paid, err)
	}
	if rec.Personal != 1000 || !rec.Capped {
		t.Errorf("deveria pagar só os 1.000 que cabem: %+v", rec)
	}
	if got := personalXP(t, db, p.UserID); got != 1000 {
		t.Errorf("XP pessoal = %d", got)
	}
}

func TestCompleteWithAFullCapPaysNothingButCountsAsDone(t *testing.T) {
	db, ctx := testDB(t)
	p, repo := payFixture(t, db, Easy)
	mustExec(t, db, `INSERT INTO event_xp_daily (user_id, day, xp) VALUES ($1, server_level_today(), 6000)`, p.UserID)
	rec, paid, err := repo.Complete(ctx, p)
	if err != nil || !paid || rec.Personal != 0 || !rec.Capped {
		t.Fatalf("teto cheio: recibo %+v pagou=%v (%v)", rec, paid, err)
	}
	if !completed(t, db, p) {
		t.Error("o objetivo conta como cumprido mesmo com o teto cheio")
	}
	if got := personalXP(t, db, p.UserID); got != 0 {
		t.Errorf("XP pessoal = %d, esperava 0", got)
	}
}

func TestCompleteServerCapIs300PerDay(t *testing.T) {
	db, ctx := testDB(t)
	p, repo := payFixture(t, db, Hard) // servidor 300
	if _, paid, err := repo.Complete(ctx, p); err != nil || !paid {
		t.Fatalf("pagou = %v (%v)", paid, err)
	}
	if got := serverXP(t, db, p.Target.ServerID); got != 300 {
		t.Fatalf("XP do servidor = %d, esperava 300", got)
	}
	// Mais um no mesmo dia, pela mesma pessoa no mesmo servidor: o teto já foi.
	second := anotherObjective(t, db, p, Easy)
	rec, paid, err := repo.Complete(ctx, second)
	if err != nil || !paid {
		t.Fatalf("segundo: pagou = %v (%v)", paid, err)
	}
	if rec.Server != 0 {
		t.Errorf("o teto do servidor cortou: %+v", rec)
	}
	if got := serverXP(t, db, p.Target.ServerID); got != 300 {
		t.Errorf("XP do servidor = %d, esperava continuar 300", got)
	}
}

// Se uma etapa falha, nada vale: nem a conclusão nem o XP.
func TestCompleteRollsBackOnFailure(t *testing.T) {
	db, ctx := testDB(t)
	p, repo := payFixture(t, db, Easy)
	// O teto diário aponta para uma linha que o banco recusa: força a falha no meio.
	mustExec(t, db, `ALTER TABLE event_xp_daily ADD CONSTRAINT teste_falha CHECK (xp < 500) NOT VALID`)
	t.Cleanup(func() { mustExec(t, db, `ALTER TABLE event_xp_daily DROP CONSTRAINT IF EXISTS teste_falha`) })

	if _, paid, err := repo.Complete(ctx, p); err == nil || paid {
		t.Fatalf("deveria falhar (pagou = %v, err = %v)", paid, err)
	}
	if completed(t, db, p) {
		t.Error("a conclusão deveria ter voltado atrás")
	}
	if personalXP(t, db, p.UserID) != 0 || serverXP(t, db, p.Target.ServerID) != 0 {
		t.Error("nenhum XP pode ter entrado")
	}
}
