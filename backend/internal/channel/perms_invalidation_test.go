package channel

import (
	"context"
	"reflect"
	"testing"

	"gin-quickstart/backend/internal/permission"
)

// recordingCache anota o que foi invalidado no cache de permissões.
type recordingCache struct{ calls []string }

func (c *recordingCache) InvalidateServer(serverID string) {
	c.calls = append(c.calls, "server:"+serverID)
}

func (c *recordingCache) InvalidateChannel(channelID string) {
	c.calls = append(c.calls, "channel:"+channelID)
}

// nopStore aceita toda escrita (o que importa é o decorador em volta).
type nopStore struct{ store }

func (nopStore) Create(context.Context, *Channel, []permission.Overwrite) error { return nil }
func (nopStore) Delete(context.Context, string) error                           { return nil }
func (nopStore) SetOverwrite(context.Context, string, permission.Overwrite) error {
	return nil
}
func (nopStore) DeleteOverwrite(context.Context, string, string, string) error { return nil }

func TestChannelWritesInvalidateThePermissionCache(t *testing.T) {
	ctx := context.Background()
	cases := []struct {
		name  string
		write func(s store) error
		want  string
	}{
		{"Create", func(s store) error { return s.Create(ctx, &Channel{ID: "c1", ServerID: "s1"}, nil) }, "server:s1"},
		{"Delete", func(s store) error { return s.Delete(ctx, "c1") }, "channel:c1"},
		{"SetOverwrite", func(s store) error { return s.SetOverwrite(ctx, "c1", permission.Overwrite{}) }, "channel:c1"},
		{"DeleteOverwrite", func(s store) error { return s.DeleteOverwrite(ctx, "c1", "role", "r1") }, "channel:c1"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			cache := &recordingCache{}
			if err := tc.write(withPermissionCache(nopStore{}, cache)); err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(cache.calls, []string{tc.want}) {
				t.Fatalf("invalidou %v, queria [%s]", cache.calls, tc.want)
			}
		})
	}
}

func TestSetPermissionCacheWrapsTheStore(t *testing.T) {
	cache := &recordingCache{}
	s := newService(nopStore{}, nil)
	s.SetPermissionCache(cache)
	if err := s.repository.Delete(context.Background(), "c1"); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(cache.calls, []string{"channel:c1"}) {
		t.Fatalf("invalidou %v", cache.calls)
	}
}
