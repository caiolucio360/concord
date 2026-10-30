package main

import (
	"context"

	"gin-quickstart/backend/internal/channel"
)

// channelServers: o servidor do canal pelo cache de permissões.
type channelServers interface {
	ChannelServerID(ctx context.Context, channelID string) (string, error)
}

// cachedChannels é o ChannelResolver das mensagens: o servidor do canal sai do
// índice do cache de permissões (uma consulta a menos por mensagem) e o resto
// (IsSystemChannel, descoberto por type assertion) continua no repositório.
type cachedChannels struct {
	*channel.Repository
	servers channelServers
}

func (a *app) cachedChannels() cachedChannels {
	return cachedChannels{Repository: a.channelRepository, servers: a.permissionService}
}

func (c cachedChannels) ChannelServerID(ctx context.Context, channelID string) (string, error) {
	return c.servers.ChannelServerID(ctx, channelID)
}
