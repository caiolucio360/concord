package role

import "context"

// PermissionCache é o pedaço do permission.Service que esquece o snapshot de
// um servidor (o cache não tem TTL: quem escreve avisa).
type PermissionCache interface {
	InvalidateServer(serverID string)
}

// withPermissionCache devolve o store que invalida o cache de permissões do
// servidor depois de cada escrita em cargos ou cargos de membros. Invalida
// também quando a escrita falha: custa só uma releitura.
func withPermissionCache(s store, cache PermissionCache) store {
	return invalidatingStore{store: s, cache: cache}
}

type invalidatingStore struct {
	store
	cache PermissionCache
}

func (s invalidatingStore) Create(ctx context.Context, role *Role) error {
	err := s.store.Create(ctx, role)
	s.cache.InvalidateServer(role.ServerID)
	return err
}

func (s invalidatingStore) Update(ctx context.Context, role *Role) error {
	err := s.store.Update(ctx, role)
	s.cache.InvalidateServer(role.ServerID)
	return err
}

func (s invalidatingStore) Delete(ctx context.Context, serverID, roleID string) error {
	err := s.store.Delete(ctx, serverID, roleID)
	s.cache.InvalidateServer(serverID)
	return err
}

func (s invalidatingStore) SetPositions(ctx context.Context, serverID string, positions map[string]int) error {
	err := s.store.SetPositions(ctx, serverID, positions)
	s.cache.InvalidateServer(serverID)
	return err
}

func (s invalidatingStore) AddMemberRole(ctx context.Context, serverID, userID, roleID string) error {
	err := s.store.AddMemberRole(ctx, serverID, userID, roleID)
	s.cache.InvalidateServer(serverID)
	return err
}

func (s invalidatingStore) RemoveMemberRole(ctx context.Context, serverID, userID, roleID string) error {
	err := s.store.RemoveMemberRole(ctx, serverID, userID, roleID)
	s.cache.InvalidateServer(serverID)
	return err
}
