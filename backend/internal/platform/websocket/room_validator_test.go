package websocket

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
)

type fakeMembers struct {
	members map[string]bool // "servidor/usuário"
	err     error
}

func (f fakeMembers) IsMember(_ context.Context, serverID, userID string) (bool, error) {
	return f.members[serverID+"/"+userID], f.err
}

type fakeCallRouter struct{ participants map[string]bool }

func (fakeCallRouter) HandleCallMessage(string, string, json.RawMessage) {}
func (f fakeCallRouter) IsParticipant(callID, userID string) bool {
	return f.participants[callID+"/"+userID]
}

func TestValidatorRoomsByKind(t *testing.T) {
	h := &Handler{
		members:    fakeMembers{members: map[string]bool{"s1/ana": true}},
		callRouter: fakeCallRouter{participants: map[string]bool{"call1/ana": true}},
	}
	ctx := context.Background()
	cases := []struct {
		name                                      string
		user, server, userRoom, call, channel, dm string
		want                                      bool
	}{
		{name: "sala do próprio usuário", user: "ana", userRoom: "ana", want: true},
		{name: "sala de outro usuário", user: "ana", userRoom: "bia"},
		{name: "membro do servidor", user: "ana", server: "s1", want: true},
		{name: "não membro do servidor", user: "bia", server: "s1"},
		{name: "na call", user: "ana", call: "call1", want: true},
		{name: "fora da call", user: "bia", call: "call1"},
		{name: "nenhuma sala", user: "ana"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := h.validator(ctx, tc.user, tc.channel, tc.dm, tc.server, tc.userRoom, tc.call)
			if got != tc.want {
				t.Fatalf("validator = %v, queria %v", got, tc.want)
			}
		})
	}
}

func TestValidatorRefusesOnMembershipErrorAndWithoutCallRouter(t *testing.T) {
	h := &Handler{members: fakeMembers{members: map[string]bool{"s1/ana": true}, err: errors.New("banco fora")}}
	if h.validator(context.Background(), "ana", "", "", "s1", "", "") {
		t.Fatal("erro ao checar membro: não entra")
	}
	if h.validator(context.Background(), "ana", "", "", "", "", "call1") {
		t.Fatal("sem roteador de call: não entra")
	}
}
