package guest

import (
	"context"
	"log"
)

// MemberJoined: a pessoa entrou no servidor de fato (convite do servidor ou
// qualquer outro caminho). O acesso de visitante dela lá acaba sem tirá-la da
// call: fica encerrado no banco, a chamada passa a tratá-la como membro e os
// apps dela recebem guest:ended com o motivo "member" (o trilho tira a visita
// e a tela vai para o servidor). Vale mesmo para o acesso já vencido que o
// sweep ainda não encerrou (senão o sweep tiraria o novo membro da call).
func (s *Service) MemberJoined(ctx context.Context, serverID, userID string) {
	passes := s.active.matching(func(p Pass) bool { return p.UserID == userID && p.ServerID == serverID })
	if len(passes) == 0 {
		return
	}
	for _, p := range passes {
		s.close(ctx, p)
	}
	s.calls.GuestBecameMember(ctx, serverID, userID)
	s.notify.SendToUser(userID, endedEvent(serverID, EndMember))
}

// close grava o fim do acesso e o tira do índice.
func (s *Service) close(ctx context.Context, p Pass) {
	if err := s.store.EndPass(ctx, p.ID, s.now()); err != nil {
		log.Printf("[guest] encerrar acesso %s falhou: %v", p.ID, err)
	}
	s.active.remove(p)
}
