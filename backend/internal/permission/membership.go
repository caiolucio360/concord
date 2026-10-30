package permission

import (
	"context"
	"errors"
)

// IsMember: userID é membro do servidor? Vem do snapshot em cache, que já é
// invalidado quando alguém entra, sai, é expulso ou banido. Servidor que não
// existe dá false sem erro (como a consulta direta a server_members).
func (s *Service) IsMember(ctx context.Context, serverID, userID string) (bool, error) {
	snap, err := s.Snapshot(ctx, serverID)
	if errors.Is(err, ErrNotMember) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return snap.IsMember(userID), nil
}

// ChannelServerID: o servidor do canal, pelo índice dos snapshots em cache
// (o canal nunca muda de servidor); fora do índice, uma consulta curta.
func (s *Service) ChannelServerID(ctx context.Context, channelID string) (string, error) {
	if serverID, ok := s.cache.serverOf(channelID); ok {
		return serverID, nil
	}
	return s.store.ChannelServerID(ctx, channelID)
}
