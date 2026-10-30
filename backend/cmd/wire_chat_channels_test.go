package main

import (
	"context"
	"testing"

	"gin-quickstart/backend/internal/message"
)

type fakeChannelServers map[string]string

func (f fakeChannelServers) ChannelServerID(_ context.Context, channelID string) (string, error) {
	return f[channelID], nil
}

// O message.Service descobre o canal de sistema por type assertion no
// ChannelResolver: o adaptador com cache não pode perder isso.
func TestCachedChannelsKeepsSystemChannelCheckAndUsesTheCache(t *testing.T) {
	var resolver message.ChannelResolver = cachedChannels{servers: fakeChannelServers{"c1": "s1"}}
	if _, ok := resolver.(message.SystemChannelChecker); !ok {
		t.Fatal("o adaptador perdeu o IsSystemChannel do repositório de canais")
	}
	if got, err := resolver.ChannelServerID(context.Background(), "c1"); err != nil || got != "s1" {
		t.Fatalf("ChannelServerID = %q, %v (queria do cache)", got, err)
	}
}
