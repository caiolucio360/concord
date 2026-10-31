package eventobjective

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"gin-quickstart/backend/internal/call"
)

type fakeCalls struct{ snaps []call.CallSnapshot }

func (f fakeCalls) CallSnapshots() []call.CallSnapshot { return f.snaps }

type fakeReal map[string]bool

func (f fakeReal) Lookup(context.Context, []string, time.Time) map[string]bool { return f }

type fakeGames map[string]string

func (f fakeGames) GameName(userID string) string { return f[userID] }

type fakePub struct{ sent []string }

func (f *fakePub) SendToUser(userID string, event []byte) {
	f.sent = append(f.sent, userID+":"+string(event))
}

type fakeAnnouncer struct{ calls int }

func (f *fakeAnnouncer) Announce(string, int64, int64, int64, string, *string) { f.calls++ }

type fakeStore struct {
	mu        sync.Mutex
	rooms     []Room
	roomCalls int
	minutes   map[string]int // objectiveID|userID → total
	completed int
	failPay   bool
	failAdd   bool
	// alreadyPaid: Complete diz que já estava pago.
	alreadyPaid bool
}

func (f *fakeStore) RunningRooms(context.Context) ([]Room, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.roomCalls++
	return f.rooms, nil
}

// queried: quantas vezes as salas foram consultadas (seguro entre goroutines).
func (f *fakeStore) queried() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.roomCalls
}

func (f *fakeStore) AddMinutes(_ context.Context, obj, user string, _ time.Time, m int) (int, error) {
	if f.failAdd {
		return 0, errors.New("banco fora do ar")
	}
	if f.minutes == nil {
		f.minutes = map[string]int{}
	}
	f.minutes[obj+"|"+user] += m
	return f.minutes[obj+"|"+user], nil
}

func (f *fakeStore) Complete(context.Context, Payment) (Receipt, bool, error) {
	if f.failPay {
		return Receipt{}, false, errors.New("banco fora do ar")
	}
	if f.alreadyPaid {
		return Receipt{}, false, nil
	}
	f.completed++
	return Receipt{Personal: 1000, Server: 50, TotalXP: 1000}, true, nil
}

var tStart = time.Date(2026, 12, 1, 20, 0, 0, 0, time.UTC)

func newTestService(st *fakeStore, snaps []call.CallSnapshot) (*Service, *fakePub, *fakeAnnouncer) {
	pub, ann := &fakePub{}, &fakeAnnouncer{}
	s := newService(st, fakeCalls{snaps}, fakeReal{"ana": true}, fakeGames{}, pub, ann, tStart)
	return s, pub, ann
}

// oneRoom: uma sala com um objetivo de tempo de 2 min; só a ana disse Vou.
func oneRoom() []Room {
	r := roomFor("voz", "", "ana")
	r.Objectives = []RoomObjective{{ID: "o1", Kind: KindTime, Minutes: 2, Difficulty: Easy}}
	return []Room{r}
}

func anaInTheRoom() []call.CallSnapshot {
	return []call.CallSnapshot{{CallID: "c1", ChannelID: ptr("voz"), Voice: []string{"ana"}}}
}

// ticks avança o relógio em ticks de 10 s, de `from` até `from + n*10 s`.
func ticks(s *Service, from time.Time, n int) time.Time {
	now := from
	for i := 0; i < n; i++ {
		now = now.Add(tickInterval)
		s.tick(context.Background(), now)
	}
	return now
}

func TestTickAddsMinutesAndPaysWhenGoalIsReached(t *testing.T) {
	st := &fakeStore{rooms: oneRoom()}
	s, pub, ann := newTestService(st, anaInTheRoom())

	now := ticks(s, tStart, 6) // 60 s: 1 min
	if st.minutes["o1|ana"] != 1 || st.completed != 0 || len(pub.sent) != 1 {
		t.Fatalf("1 min: minutos=%d pagos=%d avisos=%d", st.minutes["o1|ana"], st.completed, len(pub.sent))
	}
	if !strings.Contains(pub.sent[0], `"minutes":1`) || !strings.Contains(pub.sent[0], `"done":false`) {
		t.Errorf("aviso de progresso = %s", pub.sent[0])
	}
	ticks(s, now, 6) // mais 60 s: 2 min = meta
	if st.completed != 1 || ann.calls != 1 {
		t.Fatalf("pagos=%d avisos de nível=%d", st.completed, ann.calls)
	}
	if last := pub.sent[len(pub.sent)-1]; !strings.Contains(last, `"done":true`) || !strings.Contains(last, `"xp":1000`) {
		t.Errorf("aviso de cumprido = %s", last)
	}
}

func TestTickOnlyCountsPeopleWhoSaidGoingAndAreRealAccounts(t *testing.T) {
	st := &fakeStore{rooms: oneRoom()}
	snaps := []call.CallSnapshot{{CallID: "c1", ChannelID: ptr("voz"), Voice: []string{"ana", "bia", "caio"}}}
	s, _, _ := newTestService(st, snaps) // só a ana é conta real
	ticks(s, tStart, 6)
	if len(st.minutes) != 1 || st.minutes["o1|ana"] != 1 {
		t.Fatalf("só a ana (Vou e conta real) pontua: %v", st.minutes)
	}
}

func TestTickRetriesAFailedPaymentAfterThePersonLeft(t *testing.T) {
	st := &fakeStore{rooms: oneRoom(), failPay: true}
	s, _, ann := newTestService(st, anaInTheRoom())
	now := ticks(s, tStart, 12)
	if st.completed != 0 {
		t.Fatal("o pagamento falhou, ainda não pagou")
	}
	// A pessoa saiu da sala e o banco voltou: o próximo tick refaz o pagamento.
	s.calls = fakeCalls{nil}
	st.failPay = false
	ticks(s, now, 1)
	if st.completed != 1 || ann.calls != 1 {
		t.Fatalf("pagos=%d avisos=%d, esperava 1 e 1 depois de repetir", st.completed, ann.calls)
	}
	ticks(s, now.Add(tickInterval), 3)
	if st.completed != 1 {
		t.Errorf("depois de pago não repete: %d", st.completed)
	}
}

func TestTickGivesTheMinutesBackWhenSavingFails(t *testing.T) {
	st := &fakeStore{rooms: oneRoom(), failAdd: true}
	s, _, _ := newTestService(st, anaInTheRoom())
	now := ticks(s, tStart, 6)
	if len(st.minutes) != 0 {
		t.Fatalf("a gravação falhou: %v", st.minutes)
	}
	st.failAdd = false
	ticks(s, now, 1)
	if st.minutes["o1|ana"] != 1 {
		t.Errorf("o minuto que não coube volta no tick seguinte: %v", st.minutes)
	}
}

func TestTickAlreadyPaidDoesNotAnnounce(t *testing.T) {
	st := &fakeStore{rooms: oneRoom(), alreadyPaid: true}
	s, pub, ann := newTestService(st, anaInTheRoom())
	ticks(s, tStart, 12)
	if ann.calls != 0 {
		t.Errorf("já estava pago: não anuncia nível (%d)", ann.calls)
	}
	for _, sent := range pub.sent {
		if strings.Contains(sent, `"done":true`) {
			t.Errorf("já estava pago: não manda o aviso de cumprido: %s", sent)
		}
	}
}

func TestTickSkipsTheDatabaseWithoutChannelCalls(t *testing.T) {
	st := &fakeStore{rooms: oneRoom()}
	dm := []call.CallSnapshot{{CallID: "dm", Voice: []string{"ana"}}}
	s, _, _ := newTestService(st, dm)
	ticks(s, tStart, 3)
	if st.roomCalls != 0 || len(st.minutes) != 0 {
		t.Errorf("call de DM não consulta salas nem gera progresso: consultas=%d minutos=%v", st.roomCalls, st.minutes)
	}
}

// Run olha as calls a cada intervalo e para quando o contexto acaba.
func TestRunTicksUntilTheContextEnds(t *testing.T) {
	st := &fakeStore{rooms: oneRoom()}
	s, _, _ := newTestService(st, anaInTheRoom())
	s.every = 5 * time.Millisecond

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		s.Run(ctx)
		close(done)
	}()

	deadline := time.After(2 * time.Second)
	for {
		if st.queried() > 0 {
			break
		}
		select {
		case <-deadline:
			cancel()
			t.Fatal("o Run não consultou as salas")
		case <-time.After(time.Millisecond):
		}
	}
	cancel()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("o Run deveria parar quando o contexto acaba")
	}
}

func TestRunStopsRightAwayWithACanceledContext(t *testing.T) {
	s, _, _ := newTestService(&fakeStore{}, nil)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	done := make(chan struct{})
	go func() {
		s.Run(ctx)
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("o Run não parou")
	}
}

func TestTickIgnoresCallsThatAreNotAnEventRoom(t *testing.T) {
	st := &fakeStore{rooms: oneRoom()}
	other := []call.CallSnapshot{{CallID: "c9", ChannelID: ptr("canal-comum"), Voice: []string{"ana"}}}
	s, _, _ := newTestService(st, other)
	ticks(s, tStart, 6)
	if len(st.minutes) != 0 {
		t.Errorf("canal comum não pontua: %v", st.minutes)
	}
}
