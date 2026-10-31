package event

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestReminderText(t *testing.T) {
	d := DueReminder{Title: "Noite de jogos", ChannelName: "geral", ServerName: "Salinha"}
	cases := []struct {
		offset int
		want   string
	}{
		{10, `🔔 O evento "Noite de jogos" começa em 10 minutos em #geral, no servidor Salinha.`},
		{5, `🔔 O evento "Noite de jogos" começa em 5 minutos em #geral, no servidor Salinha.`},
		{60, `🔔 O evento "Noite de jogos" começa em 1 hora em #geral, no servidor Salinha.`},
		{1440, `🔔 O evento "Noite de jogos" começa em 1 dia em #geral, no servidor Salinha.`},
		{0, `📅 O evento "Noite de jogos" está começando agora em #geral, no servidor Salinha.`},
	}
	for _, c := range cases {
		d.OffsetMinutes = c.offset
		if got := reminderText(d); got != c.want {
			t.Errorf("offset %d: %q, esperava %q", c.offset, got, c.want)
		}
	}
}

func TestStale(t *testing.T) {
	occ := time.Date(2026, 11, 1, 20, 0, 0, 0, time.UTC)
	ante := DueReminder{OffsetMinutes: 10, Occurrence: occ, DueAt: occ.Add(-10 * time.Minute)}
	if stale(ante, ante.DueAt.Add(9*time.Minute)) {
		t.Error("aviso 9 min atrasado ainda vale")
	}
	if !stale(ante, ante.DueAt.Add(11*time.Minute)) {
		t.Error("aviso de antecedência 11 min atrasado é descartado")
	}
	start := DueReminder{OffsetMinutes: 0, Occurrence: occ, DueAt: occ}
	if stale(start, occ.Add(50*time.Minute)) {
		t.Error("o 'começou' ainda sai até 1 h depois")
	}
	if !stale(start, occ.Add(61*time.Minute)) {
		t.Error("o 'começou' some depois de 1 h")
	}
}

type fakeSchedStore struct {
	due      []DueReminder
	going    map[string][]string
	goingErr error
	advanced int
}

func (f *fakeSchedStore) ClaimDue(context.Context, time.Time, int) ([]DueReminder, error) {
	out := f.due
	f.due = nil // quem já foi reivindicado não volta (idempotência do UPDATE ... RETURNING)
	return out, nil
}

func (f *fakeSchedStore) Going(_ context.Context, eventID string, _ time.Time) ([]string, error) {
	return f.going[eventID], f.goingErr
}

func (f *fakeSchedStore) AdvanceDue(context.Context, time.Time, time.Duration, *time.Location, int) (int, error) {
	f.advanced++
	return 0, nil
}

type fakeNotifier struct {
	sent   map[string][]string
	failOn string
}

func (n *fakeNotifier) Notify(_ context.Context, userID, text string) error {
	if userID == n.failOn {
		return errors.New("DM falhou")
	}
	if n.sent == nil {
		n.sent = map[string][]string{}
	}
	n.sent[userID] = append(n.sent[userID], text)
	return nil
}

func schedulerAt(store *fakeSchedStore, n *fakeNotifier, now time.Time) *Scheduler {
	s := NewScheduler(store, n)
	s.now = func() time.Time { return now }
	return s
}

var schedStart = time.Date(2026, 11, 1, 20, 0, 0, 0, time.UTC)

func dueAt(offset int) DueReminder {
	return DueReminder{
		ID: 1, EventID: "e1", Title: "Noite", ChannelName: "geral", ServerName: "Salinha",
		Occurrence: schedStart, DueAt: schedStart.Add(-time.Duration(offset) * time.Minute), OffsetMinutes: offset,
	}
}

func TestTickNotifiesOnlyWhoIsGoing(t *testing.T) {
	store := &fakeSchedStore{due: []DueReminder{dueAt(10)}, going: map[string][]string{"e1": {"ana", "beto"}}}
	n := &fakeNotifier{}
	schedulerAt(store, n, schedStart.Add(-10*time.Minute)).tick(context.Background())
	if len(n.sent) != 2 || len(n.sent["ana"]) != 1 || len(n.sent["beto"]) != 1 {
		t.Fatalf("enviados = %+v, esperava uma DM para ana e uma para beto", n.sent)
	}
	if n.sent["ana"][0] != reminderText(dueAt(10)) {
		t.Errorf("texto = %q", n.sent["ana"][0])
	}
}

func TestTickOneFailureDoesNotBlockTheOthers(t *testing.T) {
	store := &fakeSchedStore{due: []DueReminder{dueAt(5)}, going: map[string][]string{"e1": {"ana", "beto", "caio"}}}
	n := &fakeNotifier{failOn: "ana"}
	schedulerAt(store, n, schedStart.Add(-5*time.Minute)).tick(context.Background())
	if len(n.sent["beto"]) != 1 || len(n.sent["caio"]) != 1 || len(n.sent["ana"]) != 0 {
		t.Fatalf("enviados = %+v", n.sent)
	}
}

func TestTickDropsStaleReminders(t *testing.T) {
	store := &fakeSchedStore{due: []DueReminder{dueAt(10)}, going: map[string][]string{"e1": {"ana"}}}
	n := &fakeNotifier{}
	// O servidor voltou 30 min depois da hora do aviso de 10 min.
	schedulerAt(store, n, dueAt(10).DueAt.Add(30*time.Minute)).tick(context.Background())
	if len(n.sent) != 0 {
		t.Fatalf("aviso velho foi enviado: %+v", n.sent)
	}
}

func TestTickIsIdempotent(t *testing.T) {
	store := &fakeSchedStore{due: []DueReminder{dueAt(0)}, going: map[string][]string{"e1": {"ana"}}}
	n := &fakeNotifier{}
	s := schedulerAt(store, n, schedStart)
	s.tick(context.Background())
	s.tick(context.Background())
	if len(n.sent["ana"]) != 1 {
		t.Fatalf("a mesma DM saiu %d vezes", len(n.sent["ana"]))
	}
}

func TestTickAdvancesOccurrencesAfterSending(t *testing.T) {
	store := &fakeSchedStore{going: map[string][]string{}}
	schedulerAt(store, &fakeNotifier{}, schedStart).tick(context.Background())
	if store.advanced != 1 {
		t.Fatalf("AdvanceDue chamado %d vezes, esperava 1", store.advanced)
	}
}

func TestTickSurvivesGoingFailure(t *testing.T) {
	store := &fakeSchedStore{due: []DueReminder{dueAt(0)}, goingErr: errors.New("banco fora")}
	n := &fakeNotifier{}
	schedulerAt(store, n, schedStart).tick(context.Background())
	if len(n.sent) != 0 || store.advanced != 1 {
		t.Fatalf("enviados=%+v advanced=%d", n.sent, store.advanced)
	}
}
