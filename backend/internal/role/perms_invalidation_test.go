package role

import (
	"context"
	"testing"
)

// recordingCache anota quais servidores tiveram o cache de permissões invalidado.
type recordingCache struct{ servers []string }

func (c *recordingCache) InvalidateServer(serverID string) { c.servers = append(c.servers, serverID) }

// nopStore aceita toda escrita (o que importa é o decorador em volta).
type nopStore struct{ store }

func (nopStore) Create(context.Context, *Role) error                        { return nil }
func (nopStore) Update(context.Context, *Role) error                        { return nil }
func (nopStore) Delete(context.Context, string, string) error               { return nil }
func (nopStore) SetPositions(context.Context, string, map[string]int) error { return nil }
func (nopStore) AddMemberRole(context.Context, string, string, string) error {
	return nil
}
func (nopStore) RemoveMemberRole(context.Context, string, string, string) error {
	return nil
}

func TestEveryRoleWriteInvalidatesThePermissionCache(t *testing.T) {
	ctx := context.Background()
	writes := map[string]func(s store) error{
		"Create":           func(s store) error { return s.Create(ctx, &Role{ServerID: "s1"}) },
		"Update":           func(s store) error { return s.Update(ctx, &Role{ServerID: "s1"}) },
		"Delete":           func(s store) error { return s.Delete(ctx, "s1", "r1") },
		"SetPositions":     func(s store) error { return s.SetPositions(ctx, "s1", map[string]int{"r1": 2}) },
		"AddMemberRole":    func(s store) error { return s.AddMemberRole(ctx, "s1", "u1", "r1") },
		"RemoveMemberRole": func(s store) error { return s.RemoveMemberRole(ctx, "s1", "u1", "r1") },
	}
	for name, write := range writes {
		t.Run(name, func(t *testing.T) {
			cache := &recordingCache{}
			if err := write(withPermissionCache(nopStore{}, cache)); err != nil {
				t.Fatal(err)
			}
			if len(cache.servers) != 1 || cache.servers[0] != "s1" {
				t.Fatalf("invalidou %v, queria [s1]", cache.servers)
			}
		})
	}
}
