package level

import (
	"context"
	"encoding/json"
	"sync"
	"testing"
	"time"

	"gin-quickstart/backend/internal/call"
)

type fakeStore struct {
	xp      map[string]int64
	daily   map[string]int64 // segundos de call no dia em dailyOn
	dailyOn map[string]time.Time
}

func (f *fakeStore) AddCallMinutes(_ context.Context, userID string, day time.Time, minutes int64) (Added, error) {
	if !f.dailyOn[userID].Equal(day) {
		f.dailyOn[userID] = day
		f.daily[userID] = 0
	}
	xp := XPForMinutes(f.daily[userID]/60, minutes)
	f.daily[userID] += minutes * 60
	f.xp[userID] += xp
	return Added{XP: xp, TotalXP: f.xp[userID], DailySeconds: f.daily[userID]}, nil
}

type fakePublisher struct {
	mu   sync.Mutex
	sent []string // "<alvo> <tipo>"
}

func (f *fakePublisher) record(target string, raw []byte) {
	var event struct {
		Type string `json:"type"`
	}
	_ = json.Unmarshal(raw, &event)
	f.mu.Lock()
	defer f.mu.Unlock()
	f.sent = append(f.sent, target+" "+event.Type)
}

func (f *fakePublisher) SendToUser(userID string, event []byte)      { f.record("user:"+userID, event) }
func (f *fakePublisher) BroadcastToCall(callID string, event []byte) { f.record("call:"+callID, event) }
func (f *fakePublisher) BroadcastToRoom(room string, event []byte)   { f.record(room, event) }

type fakeVoice struct{ active []call.VoiceActivity }

func (f *fakeVoice) ActiveVoiceUsers() []call.VoiceActivity { return f.active }

var t0 = time.Date(2026, 10, 24, 12, 0, 0, 0, time.UTC)

func newTestService(active ...string) (*Service, *fakeStore, *fakePublisher, *fakeVoice) {
	store := &fakeStore{xp: map[string]int64{}, daily: map[string]int64{}, dailyOn: map[string]time.Time{}}
	pub := &fakePublisher{}
	voice := &fakeVoice{}
	serverID := "server-1"
	for _, id := range active {
		voice.active = append(voice.active, call.VoiceActivity{UserID: id, CallID: "call-1", ServerID: &serverID})
	}
	s := &Service{store: store, publisher: pub, voice: voice, location: brasilia(), pending: map[string]time.Duration{}, lastTick: t0}
	return s, store, pub, voice
}

// run avança o relógio em ticks de 10 s.
func run(s *Service, from time.Time, ticks int) time.Time {
	now := from
	for i := 0; i < ticks; i++ {
		now = now.Add(tickInterval)
		s.tick(context.Background(), now)
	}
	return now
}

func TestXPOnlyForCompleteMinutes(t *testing.T) {
	s, store, _, _ := newTestService("ana")

	now := run(s, t0, 5) // 50 s
	if store.xp["ana"] != 0 {
		t.Fatalf("xp after 50s = %d, want 0", store.xp["ana"])
	}
	run(s, now, 1) // 60 s
	if store.xp["ana"] != XPPerMinute {
		t.Fatalf("xp after 60s = %d, want %d", store.xp["ana"], XPPerMinute)
	}
}

func TestMutingLosesThePartialMinute(t *testing.T) {
	s, store, _, voice := newTestService("ana")

	now := run(s, t0, 5) // 50 s falando
	active := voice.active
	voice.active = nil
	now = run(s, now, 1) // mutou
	voice.active = active
	run(s, now, 5) // mais 50 s

	if store.xp["ana"] != 0 {
		t.Fatalf("xp = %d, want 0 (the 50s before muting must not carry over)", store.xp["ana"])
	}
}

func TestLongPauseDoesNotGrantMissedTime(t *testing.T) {
	s, store, _, _ := newTestService("ana")

	s.tick(context.Background(), t0.Add(10*time.Minute))
	if store.xp["ana"] != 0 {
		t.Fatalf("xp after a 10 min stall = %d, want 0", store.xp["ana"])
	}
}

func TestLevelUpIsBroadcast(t *testing.T) {
	s, store, pub, _ := newTestService("ana")
	store.xp["ana"] = XPToNext(1) - XPPerMinute // falta 1 minuto para o nível 2

	run(s, t0, 6)

	want := map[string]bool{"call:call-1 level:up": false, "server:server-1 level:up": false, "user:ana level:up": false}
	for _, sent := range pub.sent {
		if _, ok := want[sent]; ok {
			want[sent] = true
		}
	}
	for target, seen := range want {
		if !seen {
			t.Errorf("missing %q in %v", target, pub.sent)
		}
	}
}

func TestNoLevelUpEventWithoutNewLevel(t *testing.T) {
	s, _, pub, _ := newTestService("ana")
	run(s, t0, 6)

	for _, sent := range pub.sent {
		if sent != "user:ana level:update" {
			t.Fatalf("unexpected event %q", sent)
		}
	}
}

func TestDailyFatigue(t *testing.T) {
	s, store, _, _ := newTestService("ana")

	// 5 h seguidas de call (ticks de 10 s): 2 h cheias + 2 h pela metade + 1 h sem nada.
	run(s, t0, 5*60*6)
	if store.xp["ana"] != MaxXPPerDay {
		t.Fatalf("xp after 5h = %d, want %d (daily cap)", store.xp["ana"], MaxXPPerDay)
	}
}

func TestFatigueResetsAtMidnightInBrasilia(t *testing.T) {
	s, store, _, _ := newTestService("ana")

	// 23h de Brasília (02h UTC do dia seguinte) com o dia já esgotado.
	late := time.Date(2026, 10, 26, 2, 0, 0, 0, time.UTC)
	s.lastTick = late
	store.dailyOn["ana"] = s.today(late)
	store.daily["ana"] = 5 * 3600
	run(s, late, 6)
	if store.xp["ana"] != 0 {
		t.Fatalf("xp with the day exhausted = %d, want 0", store.xp["ana"])
	}

	// Passou da meia-noite em Brasília: o cansaço zera.
	s.lastTick = time.Date(2026, 10, 26, 3, 0, 0, 0, time.UTC)
	run(s, s.lastTick, 6)
	if store.xp["ana"] != XPPerMinute {
		t.Fatalf("xp after midnight = %d, want %d", store.xp["ana"], XPPerMinute)
	}
}
