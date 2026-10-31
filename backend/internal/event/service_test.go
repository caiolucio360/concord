package event

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"gin-quickstart/backend/internal/permission"
)

var testNow = time.Date(2026, 11, 1, 12, 0, 0, 0, time.UTC)

// fakeStore guarda tudo em memória; só o que o service usa.
type fakeStore struct {
	events    map[string]*Event
	reminders map[string][]ReminderRow
	rsvps     map[string]bool
	voice     map[string]bool
}

func newFakeStore() *fakeStore {
	return &fakeStore{
		events: map[string]*Event{}, reminders: map[string][]ReminderRow{},
		rsvps: map[string]bool{}, voice: map[string]bool{"voz": true},
	}
}

func rsvpKey(eventID, userID string, occ time.Time) string {
	return eventID + "|" + userID + "|" + occ.UTC().Format(time.RFC3339)
}

func (f *fakeStore) Create(_ context.Context, e *Event, rows []ReminderRow) error {
	cp := *e
	f.events[e.ID] = &cp
	f.reminders[e.ID] = rows
	return nil
}

func (f *fakeStore) Update(_ context.Context, e *Event, rows []ReminderRow) error {
	cp := *e
	f.events[e.ID] = &cp
	f.reminders[e.ID] = rows
	return nil
}

func (f *fakeStore) Cancel(_ context.Context, serverID, eventID string) error {
	e, ok := f.events[eventID]
	if !ok || e.ServerID != serverID {
		return ErrEventNotFound
	}
	now := testNow
	e.CanceledAt = &now
	delete(f.reminders, eventID)
	return nil
}

func (f *fakeStore) Find(_ context.Context, serverID, eventID string) (*Event, error) {
	e, ok := f.events[eventID]
	if !ok || e.ServerID != serverID {
		return nil, ErrEventNotFound
	}
	cp := *e
	return &cp, nil
}

func (f *fakeStore) ListUpcoming(_ context.Context, serverID, _ string) ([]Event, error) {
	out := []Event{}
	for _, e := range f.events {
		if e.ServerID == serverID && e.CanceledAt == nil && e.FinishedAt == nil {
			out = append(out, *e)
		}
	}
	return out, nil
}

func (f *fakeStore) IsVoiceChannel(_ context.Context, _, channelID string) (bool, error) {
	return f.voice[channelID], nil
}

func (f *fakeStore) SetRSVP(_ context.Context, eventID, userID string, occ time.Time, going bool) error {
	f.rsvps[rsvpKey(eventID, userID, occ)] = going
	return nil
}

func (f *fakeStore) ClearRSVP(_ context.Context, eventID, userID string, occ time.Time) error {
	delete(f.rsvps, rsvpKey(eventID, userID, occ))
	return nil
}

func (f *fakeStore) ListGoing(_ context.Context, eventID string, occ time.Time) ([]Going, error) {
	out := []Going{}
	for k, going := range f.rsvps {
		if going && len(k) > len(eventID) && k[:len(eventID)] == eventID {
			out = append(out, Going{UserID: k})
		}
	}
	return out, nil
}

type fakePerms map[string]int64

func (p fakePerms) ServerPerms(_ context.Context, _, userID string) (int64, error) {
	return p[userID], nil
}

type fakeMembers map[string]bool

func (m fakeMembers) IsMember(_ context.Context, _, userID string) (bool, error) {
	return m[userID], nil
}

type published struct {
	room  string
	event map[string]any
}

type fakePublisher struct{ sent []published }

func (p *fakePublisher) BroadcastToRoom(room string, raw []byte) {
	var ev map[string]any
	_ = json.Unmarshal(raw, &ev)
	p.sent = append(p.sent, published{room: room, event: ev})
}

type env struct {
	svc   *Service
	store *fakeStore
	pub   *fakePublisher
}

func newEnv() env {
	store := newFakeStore()
	pub := &fakePublisher{}
	svc := NewService(store,
		fakePerms{"mod": permission.ManageEvents, "membro": 0},
		fakeMembers{"mod": true, "membro": true},
		pub)
	svc.now = func() time.Time { return testNow }
	return env{svc: svc, store: store, pub: pub}
}

func goodInput() Input {
	return Input{
		ChannelID: "voz", Title: "Noite", StartsAt: testNow.Add(time.Hour),
		Recurrence: RecWeekly, ReminderOffsets: []int{10, 5},
	}
}

func TestCreateRequiresManageEvents(t *testing.T) {
	e := newEnv()
	if _, err := e.svc.Create(context.Background(), "s1", "membro", goodInput()); !errors.Is(err, ErrMissingPermission) {
		t.Fatalf("erro = %v, esperava ErrMissingPermission", err)
	}
	if len(e.store.events) != 0 || len(e.pub.sent) != 0 {
		t.Fatal("sem permissão não grava nem publica nada")
	}
}

func TestCreateStoresEventRemindersAndPublishes(t *testing.T) {
	e := newEnv()
	got, err := e.svc.Create(context.Background(), "s1", "mod", goodInput())
	if err != nil {
		t.Fatal(err)
	}
	if got.Scope != "server" || got.OccurrencesDone != 0 || !got.NextStartAt.Equal(got.StartsAt) {
		t.Errorf("evento = %+v", got)
	}
	rows := e.store.reminders[got.ID]
	if len(rows) != 3 || rows[0].OffsetMinutes != 10 || rows[1].OffsetMinutes != 5 || rows[2].OffsetMinutes != 0 {
		t.Errorf("avisos = %+v, esperava 10, 5 e 0", rows)
	}
	if len(e.pub.sent) != 1 || e.pub.sent[0].room != "server:s1" || e.pub.sent[0].event["type"] != "event:create" {
		t.Errorf("publicado = %+v", e.pub.sent)
	}
}

func TestCreateRejectsChannelThatIsNotVoice(t *testing.T) {
	e := newEnv()
	in := goodInput()
	in.ChannelID = "texto"
	if _, err := e.svc.Create(context.Background(), "s1", "mod", in); !errors.Is(err, ErrInvalidChannel) {
		t.Fatalf("erro = %v, esperava ErrInvalidChannel", err)
	}
}

func TestUpdateMovesEventAndRebuildsReminders(t *testing.T) {
	e := newEnv()
	created, _ := e.svc.Create(context.Background(), "s1", "mod", goodInput())
	e.store.events[created.ID].OccurrencesDone = 3

	in := goodInput()
	in.Title = "Outro nome"
	in.StartsAt = testNow.Add(48 * time.Hour)
	in.ReminderOffsets = []int{30}
	got, err := e.svc.Update(context.Background(), "s1", created.ID, "mod", in)
	if err != nil {
		t.Fatal(err)
	}
	if got.Title != "Outro nome" || got.OccurrencesDone != 0 || !got.NextStartAt.Equal(in.StartsAt) {
		t.Errorf("evento = %+v", got)
	}
	rows := e.store.reminders[created.ID]
	if len(rows) != 2 || rows[0].OffsetMinutes != 30 || rows[1].OffsetMinutes != 0 {
		t.Errorf("avisos = %+v, esperava 30 e 0", rows)
	}
	if last := e.pub.sent[len(e.pub.sent)-1]; last.event["type"] != "event:update" {
		t.Errorf("último evento = %v", last.event["type"])
	}
}

func TestUpdateOfCanceledOrForeignEventIsNotFound(t *testing.T) {
	e := newEnv()
	created, _ := e.svc.Create(context.Background(), "s1", "mod", goodInput())
	if _, err := e.svc.Update(context.Background(), "outro", created.ID, "mod", goodInput()); !errors.Is(err, ErrEventNotFound) {
		t.Errorf("de outro servidor = %v", err)
	}
	if err := e.svc.Cancel(context.Background(), "s1", created.ID, "mod"); err != nil {
		t.Fatal(err)
	}
	if _, err := e.svc.Update(context.Background(), "s1", created.ID, "mod", goodInput()); !errors.Is(err, ErrEventNotFound) {
		t.Errorf("cancelado = %v", err)
	}
}

func TestCancelPublishesDeleteAndNeedsPermission(t *testing.T) {
	e := newEnv()
	created, _ := e.svc.Create(context.Background(), "s1", "mod", goodInput())
	if err := e.svc.Cancel(context.Background(), "s1", created.ID, "membro"); !errors.Is(err, ErrMissingPermission) {
		t.Fatalf("membro cancelando = %v", err)
	}
	if err := e.svc.Cancel(context.Background(), "s1", created.ID, "mod"); err != nil {
		t.Fatal(err)
	}
	last := e.pub.sent[len(e.pub.sent)-1]
	payload, _ := last.event["payload"].(map[string]any)
	if last.event["type"] != "event:delete" || payload["event_id"] != created.ID || payload["server_id"] != "s1" {
		t.Errorf("publicado = %+v", last)
	}
}

func TestRSVPUsesCurrentOccurrenceAndNeedsMembership(t *testing.T) {
	e := newEnv()
	created, _ := e.svc.Create(context.Background(), "s1", "mod", goodInput())
	if err := e.svc.SetRSVP(context.Background(), "s1", created.ID, "estranho", true); !errors.Is(err, ErrNotMember) {
		t.Fatalf("não membro = %v", err)
	}
	if err := e.svc.SetRSVP(context.Background(), "s1", created.ID, "membro", true); err != nil {
		t.Fatal(err)
	}
	if going, ok := e.store.rsvps[rsvpKey(created.ID, "membro", created.NextStartAt)]; !ok || !going {
		t.Errorf("resposta não foi gravada na ocorrência atual: %+v", e.store.rsvps)
	}
	if err := e.svc.ClearRSVP(context.Background(), "s1", created.ID, "membro"); err != nil {
		t.Fatal(err)
	}
	if len(e.store.rsvps) != 0 {
		t.Errorf("ClearRSVP deixou resposta: %+v", e.store.rsvps)
	}
}

func TestRSVPPublishesTheNewGoingCount(t *testing.T) {
	e := newEnv()
	created, _ := e.svc.Create(context.Background(), "s1", "mod", goodInput())
	if err := e.svc.SetRSVP(context.Background(), "s1", created.ID, "membro", true); err != nil {
		t.Fatal(err)
	}
	assertGoingCount(t, e.pub, created.ID, 1)
	if err := e.svc.ClearRSVP(context.Background(), "s1", created.ID, "membro"); err != nil {
		t.Fatal(err)
	}
	assertGoingCount(t, e.pub, created.ID, 0)
}

func assertGoingCount(t *testing.T, pub *fakePublisher, eventID string, want float64) {
	t.Helper()
	last := pub.sent[len(pub.sent)-1]
	payload, _ := last.event["payload"].(map[string]any)
	if last.room != "server:s1" || last.event["type"] != "event:rsvp" ||
		payload["event_id"] != eventID || payload["going_count"] != want {
		t.Fatalf("publicado = %+v, esperava event:rsvp com going_count %v", last, want)
	}
}

func TestRSVPOnEndedOrCanceledEvent(t *testing.T) {
	e := newEnv()
	created, _ := e.svc.Create(context.Background(), "s1", "mod", goodInput())
	done := testNow
	e.store.events[created.ID].FinishedAt = &done
	if err := e.svc.SetRSVP(context.Background(), "s1", created.ID, "membro", true); !errors.Is(err, ErrEventEnded) {
		t.Errorf("encerrado = %v", err)
	}
	e.store.events[created.ID].FinishedAt = nil
	e.store.events[created.ID].CanceledAt = &done
	if err := e.svc.SetRSVP(context.Background(), "s1", created.ID, "membro", true); !errors.Is(err, ErrEventNotFound) {
		t.Errorf("cancelado = %v", err)
	}
}

func TestListNeedsMembership(t *testing.T) {
	e := newEnv()
	_, _ = e.svc.Create(context.Background(), "s1", "mod", goodInput())
	if _, err := e.svc.List(context.Background(), "s1", "estranho"); !errors.Is(err, ErrNotMember) {
		t.Fatalf("não membro = %v", err)
	}
	list, err := e.svc.List(context.Background(), "s1", "membro")
	if err != nil || len(list) != 1 {
		t.Fatalf("lista = %+v err=%v", list, err)
	}
}
