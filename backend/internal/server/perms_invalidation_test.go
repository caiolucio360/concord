package server

import (
	"context"
	"reflect"
	"testing"
)

// recordingCache anota quais servidores tiveram o cache de permissões invalidado.
type recordingCache struct{ servers []string }

func (c *recordingCache) InvalidateServer(serverID string) { c.servers = append(c.servers, serverID) }

// nopModerationStore aceita toda escrita (o que importa é o decorador em volta).
type nopModerationStore struct{ moderationStore }

func (nopModerationStore) BanMember(context.Context, string, string, string, *string) error {
	return nil
}

func TestBanInvalidatesThePermissionCache(t *testing.T) {
	cache := &recordingCache{}
	s := withPermissionCache(nopModerationStore{}, cache)

	if err := s.BanMember(context.Background(), "s1", "u1", "dono", nil); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(cache.servers, []string{"s1"}) {
		t.Fatalf("invalidou %v, queria [s1]", cache.servers)
	}
}

func TestRepositoryInvalidatesOnlyWithCacheSet(t *testing.T) {
	r := &Repository{}
	r.invalidatePerms("s1") // sem cache: não faz nada (nem quebra)

	cache := &recordingCache{}
	r.SetPermissionCache(cache)
	r.invalidatePerms("s1")
	if !reflect.DeepEqual(cache.servers, []string{"s1"}) {
		t.Fatalf("invalidou %v", cache.servers)
	}
}
