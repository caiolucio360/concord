package channel

import (
	"context"

	"gin-quickstart/backend/internal/permission"
)

// PermissionCache é o pedaço do permission.Service que esquece snapshots (o
// cache não tem TTL: quem escreve avisa).
type PermissionCache interface {
	InvalidateServer(serverID string)
	InvalidateChannel(channelID string)
}

// SetPermissionCache faz toda escrita que muda quem vê o quê (canal novo,
// canal apagado, sobrescritas) invalidar o cache de permissões.
func (s *Service) SetPermissionCache(cache PermissionCache) {
	s.repository = withPermissionCache(s.repository, cache)
}

// withPermissionCache invalida depois da escrita, mesmo se ela falhar (custa
// só uma releitura).
func withPermissionCache(s store, cache PermissionCache) store {
	return invalidatingStore{store: s, cache: cache}
}

type invalidatingStore struct {
	store
	cache PermissionCache
}

func (s invalidatingStore) Create(ctx context.Context, ch *Channel, overwrites []permission.Overwrite) error {
	err := s.store.Create(ctx, ch, overwrites)
	s.cache.InvalidateServer(ch.ServerID)
	return err
}

func (s invalidatingStore) Delete(ctx context.Context, id string) error {
	err := s.store.Delete(ctx, id)
	s.cache.InvalidateChannel(id)
	return err
}

func (s invalidatingStore) SetOverwrite(ctx context.Context, channelID string, o permission.Overwrite) error {
	err := s.store.SetOverwrite(ctx, channelID, o)
	s.cache.InvalidateChannel(channelID)
	return err
}

func (s invalidatingStore) DeleteOverwrite(ctx context.Context, channelID, targetType, targetID string) error {
	err := s.store.DeleteOverwrite(ctx, channelID, targetType, targetID)
	s.cache.InvalidateChannel(channelID)
	return err
}
