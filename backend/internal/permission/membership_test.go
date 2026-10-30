package permission

import (
	"context"
	"errors"
	"testing"
)

func TestIsMemberComesFromTheCachedSnapshot(t *testing.T) {
	store := newCountingStore(serverWithMember("ana"))
	svc := NewService(store)
	ctx := context.Background()

	for range 3 {
		if ok, err := svc.IsMember(ctx, "s1", "ana"); err != nil || !ok {
			t.Fatalf("ana é membro: %v, %v", ok, err)
		}
	}
	if ok, err := svc.IsMember(ctx, "s1", "bia"); err != nil || ok {
		t.Fatalf("bia não é membro: %v, %v", ok, err)
	}
	if got := store.loads.Load(); got != 1 {
		t.Fatalf("LoadSnapshot chamado %d vezes, queria 1", got)
	}
}

func TestIsMemberOfMissingServerIsFalseWithoutError(t *testing.T) {
	svc := NewService(newCountingStore())
	if ok, err := svc.IsMember(context.Background(), "nao-existe", "ana"); err != nil || ok {
		t.Fatalf("servidor que não existe: %v, %v", ok, err)
	}
}

func TestIsMemberPassesDatabaseErrorsOn(t *testing.T) {
	store := newCountingStore(serverWithMember("ana"))
	store.fail = errors.New("banco fora")
	if _, err := NewService(store).IsMember(context.Background(), "s1", "ana"); err == nil {
		t.Fatal("erro do banco não pode virar 'não é membro'")
	}
}

func TestChannelServerIDUsesTheIndexOfCachedSnapshots(t *testing.T) {
	store := newCountingStore(serverWithMember("ana"))
	svc := NewService(store)
	ctx := context.Background()

	if got, err := svc.ChannelServerID(ctx, "c1"); err != nil || got != "s1" {
		t.Fatalf("sem cache: %q, %v", got, err)
	}
	_, _ = svc.Snapshot(ctx, "s1")
	before := store.channelQs.Load()
	for range 3 {
		if got, err := svc.ChannelServerID(ctx, "c1"); err != nil || got != "s1" {
			t.Fatalf("ChannelServerID = %q, %v", got, err)
		}
	}
	if got := store.channelQs.Load() - before; got != 0 {
		t.Fatalf("foi ao banco %d vezes com o servidor no cache", got)
	}
	if _, err := svc.ChannelServerID(ctx, "nao-existe"); !errors.Is(err, ErrChannelNotFound) {
		t.Fatalf("canal que não existe: %v", err)
	}
}
