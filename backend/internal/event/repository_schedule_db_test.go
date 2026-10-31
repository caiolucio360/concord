package event

import (
	"testing"
	"time"
)

func TestClaimDueIsIdempotentAndSkipsCanceled(t *testing.T) {
	db, ctx := eventDB(t)
	repo := NewRepository(db)
	owner, server := seedUserAndServer(t, db, "Salinha")
	channel := seedChannel(t, db, server, owner, "voice")
	start := time.Now().Add(time.Minute).Truncate(time.Second)

	live := newTestEvent(server, channel, owner, start)
	canceled := newTestEvent(server, channel, owner, start)
	for _, e := range []*Event{live, canceled} {
		if err := repo.Create(ctx, e, nil); err != nil {
			t.Fatal(err)
		}
		mustExec(t, db, `INSERT INTO event_reminders (event_id, occurrence_start, offset_minutes, due_at)
			VALUES ($1, $2, 0, NOW() - INTERVAL '1 minute')`, e.ID, start)
	}
	mustExec(t, db, `UPDATE server_events SET canceled_at = NOW() WHERE id = $1`, canceled.ID)

	got, err := repo.ClaimDue(ctx, time.Now(), 50)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0].EventID != live.ID || got[0].Title != "Noite" || got[0].ServerName != "Salinha" || got[0].ChannelName == "" {
		t.Fatalf("reivindicados = %+v, esperava só o evento vivo, com título, servidor e canal", got)
	}
	again, err := repo.ClaimDue(ctx, time.Now(), 50)
	if err != nil || len(again) != 0 {
		t.Fatalf("segunda chamada devolveu %+v err=%v, esperava vazio", again, err)
	}
}

func TestGoingReturnsOnlyWhoSaidYes(t *testing.T) {
	db, ctx := eventDB(t)
	repo := NewRepository(db)
	owner, server := seedUserAndServer(t, db, "Salinha")
	other, otherServer := seedUserAndServer(t, db, "Outro")
	_ = otherServer
	mustExec(t, db, `INSERT INTO server_members (server_id, user_id) VALUES ($1, $2)`, server, other)
	channel := seedChannel(t, db, server, owner, "voice")
	start := time.Now().Add(time.Hour).Truncate(time.Second)
	e := newTestEvent(server, channel, owner, start)
	if err := repo.Create(ctx, e, nil); err != nil {
		t.Fatal(err)
	}
	_ = repo.SetRSVP(ctx, e.ID, owner, start, true)
	_ = repo.SetRSVP(ctx, e.ID, other, start, false)

	ids, err := repo.Going(ctx, e.ID, start)
	if err != nil || len(ids) != 1 || ids[0] != owner {
		t.Fatalf("ids = %v err=%v", ids, err)
	}
}

func insertEndedEvent(t *testing.T, repo *Repository, server, channel, owner string, rule Recurrence, endedAgo time.Duration) *Event {
	t.Helper()
	start := time.Now().Add(-endedAgo).Truncate(time.Second)
	e := newTestEvent(server, channel, owner, start)
	e.Recurrence = rule
	if err := repo.Create(t.Context(), e, nil); err != nil {
		t.Fatal(err)
	}
	return e
}

func TestAdvanceDueMovesWeeklyEventToNextWeek(t *testing.T) {
	db, ctx := eventDB(t)
	repo := NewRepository(db)
	owner, server := seedUserAndServer(t, db, "Salinha")
	channel := seedChannel(t, db, server, owner, "voice")
	e := insertEndedEvent(t, repo, server, channel, owner, RecWeekly, 4*time.Hour)

	n, err := repo.AdvanceDue(ctx, time.Now(), 3*time.Hour, brt, 50)
	if err != nil || n != 1 {
		t.Fatalf("avançou %d err=%v, esperava 1", n, err)
	}
	got, err := repo.Find(ctx, server, e.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.OccurrencesDone != 1 || got.FinishedAt != nil || !got.NextStartAt.Equal(e.StartsAt.AddDate(0, 0, 7)) {
		t.Fatalf("depois de avançar: done=%d finished=%v next=%v (início %v)", got.OccurrencesDone, got.FinishedAt, got.NextStartAt, e.StartsAt)
	}
	var pending int
	_ = db.QueryRow(ctx, `SELECT COUNT(*) FROM event_reminders WHERE event_id = $1 AND occurrence_start = $2 AND sent_at IS NULL`,
		e.ID, got.NextStartAt).Scan(&pending)
	if pending != 3 {
		t.Errorf("avisos da ocorrência nova = %d, esperava 3 (10, 5 e na hora)", pending)
	}
}

func TestAdvanceDueFinishesNonRepeatingEvent(t *testing.T) {
	db, ctx := eventDB(t)
	repo := NewRepository(db)
	owner, server := seedUserAndServer(t, db, "Salinha")
	channel := seedChannel(t, db, server, owner, "voice")
	e := insertEndedEvent(t, repo, server, channel, owner, RecNone, 4*time.Hour)

	if n, err := repo.AdvanceDue(ctx, time.Now(), 3*time.Hour, brt, 50); err != nil || n != 1 {
		t.Fatalf("avançou %d err=%v", n, err)
	}
	if list, _ := repo.ListUpcoming(ctx, server, owner); len(list) != 0 {
		t.Errorf("evento encerrado ainda aparece: %+v", list)
	}
	got, _ := repo.Find(ctx, server, e.ID)
	if got.FinishedAt == nil {
		t.Error("finished_at deveria estar preenchido")
	}
}

func TestAdvanceDueLeavesRunningEventAlone(t *testing.T) {
	db, ctx := eventDB(t)
	repo := NewRepository(db)
	owner, server := seedUserAndServer(t, db, "Salinha")
	channel := seedChannel(t, db, server, owner, "voice")
	e := insertEndedEvent(t, repo, server, channel, owner, RecWeekly, time.Hour) // começou há 1 h, ainda dura

	if n, err := repo.AdvanceDue(ctx, time.Now(), 3*time.Hour, brt, 50); err != nil || n != 0 {
		t.Fatalf("avançou %d err=%v, esperava 0", n, err)
	}
	if got, _ := repo.Find(ctx, server, e.ID); got.OccurrencesDone != 0 {
		t.Errorf("occurrences_done = %d", got.OccurrencesDone)
	}
}
