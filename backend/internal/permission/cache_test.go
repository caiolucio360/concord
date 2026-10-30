package permission

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// countingStore conta as idas ao banco; gate (se houver) segura o
// LoadSnapshot até alguém fechar, para testar leituras simultâneas.
type countingStore struct {
	mu        sync.Mutex
	snaps     map[string]*Snapshot
	loads     atomic.Int32
	channelQs atomic.Int32
	fail      error
	gate      chan struct{}
	started   chan struct{}
}

func newCountingStore(snaps ...*Snapshot) *countingStore {
	s := &countingStore{snaps: map[string]*Snapshot{}}
	for _, snap := range snaps {
		s.snaps[snap.ServerID] = snap
	}
	return s
}

func (s *countingStore) set(snap *Snapshot) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.snaps[snap.ServerID] = snap
}

func (s *countingStore) LoadSnapshot(_ context.Context, serverID string) (*Snapshot, error) {
	s.loads.Add(1)
	s.mu.Lock()
	snap, ok := s.snaps[serverID]
	fail, gate, started := s.fail, s.gate, s.started
	s.mu.Unlock()
	if started != nil {
		started <- struct{}{}
	}
	if gate != nil {
		<-gate
	}
	if fail != nil {
		return nil, fail
	}
	if !ok {
		return nil, ErrNotMember
	}
	return snap, nil
}

func (s *countingStore) ChannelServerID(_ context.Context, channelID string) (string, error) {
	s.channelQs.Add(1)
	s.mu.Lock()
	defer s.mu.Unlock()
	for id, snap := range s.snaps {
		if _, ok := snap.Channels[channelID]; ok {
			return id, nil
		}
	}
	return "", ErrChannelNotFound
}

func serverWithMember(member string) *Snapshot {
	return NewSnapshot("s1", "owner", ViewChannel|SendMessages).
		WithChannel("c1", "text").
		WithMember("owner").
		WithMember(member)
}

func TestSnapshotIsLoadedOncePerServer(t *testing.T) {
	store := newCountingStore(serverWithMember("ana"))
	svc := NewService(store)
	ctx := context.Background()

	for range 3 {
		if err := svc.Require(ctx, "s1", "ana", SendMessages); err != nil {
			t.Fatalf("Require: %v", err)
		}
	}
	if got := store.loads.Load(); got != 1 {
		t.Fatalf("LoadSnapshot chamado %d vezes, queria 1", got)
	}
}

func TestChannelChecksReuseServerSnapshotAndChannelIndex(t *testing.T) {
	store := newCountingStore(serverWithMember("ana"))
	svc := NewService(store)
	ctx := context.Background()

	for range 3 {
		if err := svc.RequireChannel(ctx, "c1", "ana", ViewChannel); err != nil {
			t.Fatalf("RequireChannel: %v", err)
		}
	}
	if got := store.loads.Load(); got != 1 {
		t.Fatalf("LoadSnapshot chamado %d vezes, queria 1", got)
	}
	if got := store.channelQs.Load(); got != 1 {
		t.Fatalf("ChannelServerID chamado %d vezes, queria 1", got)
	}
}

func TestInvalidateServerReloadsTheSnapshot(t *testing.T) {
	store := newCountingStore(serverWithMember("ana"))
	svc := NewService(store)
	ctx := context.Background()
	if _, err := svc.ServerPerms(ctx, "s1", "bia"); !errors.Is(err, ErrNotMember) {
		t.Fatalf("bia ainda não entrou: err = %v", err)
	}

	store.set(serverWithMember("ana").WithMember("bia"))
	svc.InvalidateServer("s1")

	if _, err := svc.ServerPerms(ctx, "s1", "bia"); err != nil {
		t.Fatalf("depois de invalidar, bia é membro: err = %v", err)
	}
}

func TestInvalidateChannelReloadsItsServer(t *testing.T) {
	store := newCountingStore(serverWithMember("ana"))
	svc := NewService(store)
	ctx := context.Background()
	if err := svc.RequireChannel(ctx, "c1", "ana", ViewChannel); err != nil {
		t.Fatalf("RequireChannel: %v", err)
	}

	// Canal virou privado: @everyone perde o VIEW_CHANNEL.
	store.set(NewSnapshot("s1", "owner", ViewChannel|SendMessages).
		WithChannel("c1", "text", Overwrite{TargetType: TargetRole, TargetID: "everyone", Deny: ViewChannel}).
		WithMember("owner").WithMember("ana"))
	svc.InvalidateChannel("c1")

	if err := svc.RequireChannel(ctx, "c1", "ana", ViewChannel); !errors.Is(err, ErrMissingPermission) {
		t.Fatalf("depois de invalidar o canal, ana não vê: err = %v", err)
	}
}

func TestDeletedChannelIsNotFoundAfterInvalidation(t *testing.T) {
	store := newCountingStore(serverWithMember("ana"))
	svc := NewService(store)
	ctx := context.Background()
	if err := svc.RequireChannel(ctx, "c1", "ana", ViewChannel); err != nil {
		t.Fatalf("RequireChannel: %v", err)
	}

	store.set(NewSnapshot("s1", "owner", ViewChannel).WithMember("owner").WithMember("ana"))
	svc.InvalidateChannel("c1")

	if err := svc.RequireChannel(ctx, "c1", "ana", ViewChannel); !errors.Is(err, ErrChannelNotFound) {
		t.Fatalf("canal apagado: err = %v, queria ErrChannelNotFound", err)
	}
}

func TestErrorsAreNotCached(t *testing.T) {
	store := newCountingStore(serverWithMember("ana"))
	store.fail = errors.New("banco fora")
	svc := NewService(store)
	ctx := context.Background()
	if _, err := svc.Snapshot(ctx, "s1"); err == nil {
		t.Fatal("queria o erro do banco")
	}

	store.mu.Lock()
	store.fail = nil
	store.mu.Unlock()
	if _, err := svc.Snapshot(ctx, "s1"); err != nil {
		t.Fatalf("depois do erro, a próxima leitura vai ao banco: %v", err)
	}
}

func TestConcurrentReadersShareOneLoad(t *testing.T) {
	store := newCountingStore(serverWithMember("ana"))
	store.gate = make(chan struct{})
	store.started = make(chan struct{}, 10)
	svc := NewService(store)

	var wg sync.WaitGroup
	for range 5 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := svc.Snapshot(context.Background(), "s1"); err != nil {
				t.Errorf("Snapshot: %v", err)
			}
		}()
	}
	<-store.started
	time.Sleep(20 * time.Millisecond) // os outros quatro chegam e esperam
	close(store.gate)
	wg.Wait()

	if got := store.loads.Load(); got != 1 {
		t.Fatalf("LoadSnapshot chamado %d vezes, queria 1", got)
	}
}

// Uma leitura que começou antes da escrita não pode gravar o snapshot velho
// depois da invalidação (sem TTL, ele ficaria para sempre).
func TestLoadStartedBeforeInvalidationIsNotCached(t *testing.T) {
	store := newCountingStore(serverWithMember("ana"))
	oldGate := make(chan struct{})
	store.gate = oldGate
	store.started = make(chan struct{}, 10)
	svc := NewService(store)

	done := make(chan struct{})
	go func() {
		defer close(done)
		_, _ = svc.Snapshot(context.Background(), "s1") // lê o estado sem a bia
	}()
	<-store.started

	// Escrita: bia entra; o repositório invalida depois do commit.
	store.mu.Lock()
	store.snaps["s1"] = serverWithMember("ana").WithMember("bia")
	store.gate, store.started = nil, nil
	store.mu.Unlock()
	svc.InvalidateServer("s1")

	// Quem pergunta depois da escrita não pega carona na leitura velha.
	if _, err := svc.ServerPerms(context.Background(), "s1", "bia"); err != nil {
		t.Fatalf("logo depois da escrita: err = %v", err)
	}

	close(oldGate)
	<-done
	if _, err := svc.ServerPerms(context.Background(), "s1", "bia"); err != nil {
		t.Fatalf("a leitura velha não pode ficar no cache: err = %v", err)
	}
}
