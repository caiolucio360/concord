package eventobjective

import (
	"context"
	"testing"
	"time"

	"gin-quickstart/backend/internal/call"

	"github.com/jackc/pgx/v5/pgxpool"
)

// O ciclo todo com o banco de verdade: sala aberta, Vou, 15 minutos na call e o
// pagamento uma vez só.
func TestServiceFullCycleWithTheDatabase(t *testing.T) {
	db, _ := testDB(t)
	repo := NewRepository(db)
	user, serverID, eventID := seedEvent(t, db)
	channel := seedVoiceChannel(t, db, serverID, user)
	replace(t, db, eventID, []Input{{KindTime, Easy, 15}})
	mustExec(t, db, `UPDATE server_events SET voice_channel_id = $2 WHERE id = $1`, eventID, channel)
	mustExec(t, db, `INSERT INTO event_rsvps (event_id, user_id, occurrence_start, going)
		VALUES ($1, $2, (SELECT next_start_at FROM server_events WHERE id = $1), true)`, eventID, user)

	snaps := []call.CallSnapshot{{CallID: "c1", ChannelID: &channel, Voice: []string{user}}}
	pub, ann := &fakePub{}, &fakeAnnouncer{}
	s := newService(repo, fakeCalls{snaps}, fakeReal{user: true}, fakeGames{}, pub, ann, tStart)

	now := ticks(s, tStart, 6*14) // 14 min: ainda não
	if got := personalXP(t, db, user); got != 0 {
		t.Fatalf("XP pessoal antes da meta = %d", got)
	}
	now = ticks(s, now, 6) // 15 min: paga
	if got := personalXP(t, db, user); got != 1000 {
		t.Fatalf("XP pessoal = %d, esperava 1000", got)
	}
	if got := serverXP(t, db, serverID); got != 50 {
		t.Fatalf("XP do servidor = %d, esperava 50", got)
	}
	if ann.calls != 1 {
		t.Errorf("avisos de nível = %d", ann.calls)
	}

	// Mais tempo na sala não paga de novo.
	ticks(s, now, 6*5)
	if got := personalXP(t, db, user); got != 1000 {
		t.Errorf("não pode pagar duas vezes: %d", got)
	}
	refs := []EventRef{{eventID, occurrenceOf(t, db, eventID)}}
	if got := mustLoad(t, db, user, refs)[0]; !got.MyDone || got.MyMinutes < 15 {
		t.Errorf("objetivo = %+v", got)
	}
}

func occurrenceOf(t *testing.T, db *pgxpool.Pool, eventID string) time.Time {
	t.Helper()
	var occ time.Time
	if err := db.QueryRow(context.Background(), `SELECT next_start_at FROM server_events WHERE id = $1`, eventID).Scan(&occ); err != nil {
		t.Fatal(err)
	}
	return occ
}
