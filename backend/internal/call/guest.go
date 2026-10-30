package call

import (
	"context"

	"gin-quickstart/backend/internal/channel"
	"gin-quickstart/backend/internal/permission"
)

// Visitantes na call (docs/adr/0017-visitante-na-call.md): quem não é membro
// do servidor entra só no canal de voz do convite, com as permissões que o
// convite deu. Os acessos ficam no internal/guest; aqui a chamada só consulta.

// GuestAccess é o que a chamada usa dos acessos de visitante (guest.Service).
type GuestAccess interface {
	// GuestChannelPerms: as permissões do visitante no canal (ok=false se ele
	// não tem acesso ativo a esse canal).
	GuestChannelPerms(ctx context.Context, channelID, userID string) (int64, bool)
	// GuestOf: o servidor em que o usuário é visitante agora ("" se não é).
	GuestOf(userID string) string
	// MoveGuest troca o canal permitido do visitante (moderador o moveu).
	// false se ele não tem acesso ativo nesse servidor.
	MoveGuest(ctx context.Context, userID, serverID, channelID string) bool
}

// SetGuests liga os visitantes às chamadas. Os dados de quem está na call
// passam a dizer de qual servidor a pessoa é visitante (selo "Visitante").
func (s *Service) SetGuests(g GuestAccess) {
	s.guests = g
	base := s.lookupUser
	s.lookupUser = func(ctx context.Context, userID string) (UserInfo, error) {
		info, err := base(ctx, userID)
		if err == nil {
			info.GuestOf = g.GuestOf(userID)
		}
		return info, err
	}
}

func (s *Service) guestPerms(ctx context.Context, channelID, userID string) (int64, bool) {
	if s.guests == nil {
		return 0, false
	}
	return s.guests.GuestChannelPerms(ctx, channelID, userID)
}

// channelPerms: as permissões no canal de voz — as do membro ou, para quem não
// é membro, as do convite de visitante. Sem nenhum dos dois, o erro do membro.
func (s *Service) channelPerms(ctx context.Context, channelID, userID string) (int64, error) {
	perms, err := s.perms.ChannelPerms(ctx, channelID, userID)
	if err == nil {
		return perms, nil
	}
	if guest, ok := s.guestPerms(ctx, channelID, userID); ok {
		return guest, nil
	}
	return 0, err
}

// permsIn: como channelPerms, a partir de um snapshot já lido.
func (s *Service) permsIn(ctx context.Context, snap *permission.Snapshot, channelID, userID string) int64 {
	if snap.IsMember(userID) {
		return snap.Channel(channelID, userID)
	}
	guest, _ := s.guestPerms(ctx, channelID, userID)
	return guest
}

// admitMovedGuest: um moderador moveu alguém que não é membro (um visitante).
// O acesso dele passa a valer no canal de destino; sem acesso no servidor, não
// dá para mover.
func (s *Service) admitMovedGuest(ctx context.Context, snap *permission.Snapshot, targetID string, dest *channel.Channel) error {
	if snap.IsMember(targetID) {
		return nil
	}
	if s.guests == nil || !s.guests.MoveGuest(ctx, targetID, dest.ServerID, dest.ID) {
		return ErrTargetCannotJoin
	}
	return nil
}

// guestUsesSoundboard: o visitante usa a mesa de áudio na call do convite se o
// @everyone pode usá-la naquele canal. É a regra mais simples: ele herda o que
// vale para um membro sem cargo (ver e entrar o convite já dá).
func (s *Service) guestUsesSoundboard(ctx context.Context, serverID, channelID, userID string) bool {
	if _, ok := s.guestPerms(ctx, channelID, userID); !ok {
		return false
	}
	snap, err := s.perms.Snapshot(ctx, serverID)
	if err != nil {
		return false
	}
	return permission.Has(everyoneIn(snap, channelID), permission.UseSoundboard)
}

// everyoneIn: as permissões do @everyone no canal (as do servidor com a
// sobrescrita do @everyone naquele canal).
func everyoneIn(snap *permission.Snapshot, channelID string) int64 {
	perms := snap.Everyone.Permissions
	if perms&permission.Administrator != 0 {
		return permission.All
	}
	for _, o := range snap.Channels[channelID].Overwrites {
		if o.TargetType == permission.TargetRole && o.TargetID == snap.Everyone.ID {
			perms = perms&^o.Deny | o.Allow
		}
	}
	return perms
}

// GuestMemberEvent: quem estava na call como visitante virou membro do
// servidor (guest:member; o app tira o selo "Visitante").
type GuestMemberEvent struct {
	CallID   string `json:"call_id"`
	ServerID string `json:"server_id"`
	UserID   string `json:"user_id"`
}

// GuestBecameMember: o visitante entrou no servidor de fato (o internal/guest
// já encerrou o acesso). Ele segue na mesma call e na mesma conexão de mídia:
// as permissões de membro passam a valer (RevalidateServer atualiza o grant ou,
// se como membro ele não pode estar no canal, tira da call) e a call fica
// sabendo para tirar o selo.
func (s *Service) GuestBecameMember(ctx context.Context, serverID, userID string) {
	s.RevalidateServer(ctx, serverID)
	for callID, vc := range s.voiceCallsOf(serverID) {
		if _, in := vc.participants[userID]; !in {
			continue
		}
		event := marshalEvent("guest:member", GuestMemberEvent{CallID: callID, ServerID: serverID, UserID: userID})
		s.publisher.BroadcastToCall(callID, event)
		s.broadcastServer(serverID, &vc.channelID, event)
	}
}
