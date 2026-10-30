package server

import "context"

// PermissionCache é o pedaço do permission.Service que esquece o snapshot de
// um servidor (o cache não tem TTL: quem escreve avisa).
type PermissionCache interface {
	InvalidateServer(serverID string)
}

// SetPermissionCache faz as escritas de membros e o apagar do servidor
// invalidarem o cache de permissões (o Service usa o Repository direto).
func (r *Repository) SetPermissionCache(cache PermissionCache) {
	r.perms = cache
}

// invalidatePerms vem depois da escrita, mesmo se ela falhar (custa só uma
// releitura).
func (r *Repository) invalidatePerms(serverID string) {
	if r.perms != nil {
		r.perms.InvalidateServer(serverID)
	}
}

// withPermissionCache: banir tira o membro numa transação própria
// (expulsar e sair passam pelo RemoveMember do Repository, que já invalida).
func withPermissionCache(s moderationStore, cache PermissionCache) moderationStore {
	return invalidatingModerationStore{moderationStore: s, cache: cache}
}

type invalidatingModerationStore struct {
	moderationStore
	cache PermissionCache
}

func (s invalidatingModerationStore) BanMember(ctx context.Context, serverID, userID, bannedBy string, reason *string) error {
	err := s.moderationStore.BanMember(ctx, serverID, userID, bannedBy, reason)
	s.cache.InvalidateServer(serverID)
	return err
}
