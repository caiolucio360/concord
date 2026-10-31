package event

import (
	"context"
	"fmt"
)

// Access diz o que a pessoa pode fazer com os eventos (para o app mostrar só os
// botões que valem). Quem não é membro do servidor não vê nada.
func (s *Service) Access(ctx context.Context, serverID, userID string) (AccessView, error) {
	if err := s.requireMember(ctx, serverID, userID); err != nil {
		return AccessView{}, err
	}
	actions, err := s.access.EventActions(ctx, serverID, userID)
	if err != nil {
		return AccessView{}, fmt.Errorf("conferir permissões: %w", err)
	}
	owner, err := s.access.IsOwner(ctx, serverID, userID)
	if err != nil {
		return AccessView{}, fmt.Errorf("conferir dono: %w", err)
	}
	return AccessView{
		Create: actions.Has(ActionCreate),
		Edit:   actions.Has(ActionEdit),
		Delete: actions.Has(ActionDelete),
		Owner:  owner,
	}, nil
}

// requireOwner: a configuração por cargo é só do dono do servidor (nem quem tem
// todas as ações num cargo, nem Administrador, mexe nela).
func (s *Service) requireOwner(ctx context.Context, serverID, userID string) error {
	owner, err := s.access.IsOwner(ctx, serverID, userID)
	if err != nil {
		return fmt.Errorf("conferir dono: %w", err)
	}
	if !owner {
		return ErrOwnerOnly
	}
	return nil
}

// RoleSettings lista os cargos do servidor e o que cada um pode fazer com os eventos.
func (s *Service) RoleSettings(ctx context.Context, serverID, userID string) ([]RoleAccess, error) {
	if err := s.requireOwner(ctx, serverID, userID); err != nil {
		return nil, err
	}
	return s.access.RoleAccessList(ctx, serverID)
}

// SetRoleActions muda o que um cargo pode fazer com os eventos e avisa o app, que
// recalcula os botões de todo mundo.
func (s *Service) SetRoleActions(ctx context.Context, serverID, actorID, roleID string, actions Actions) error {
	if err := s.requireOwner(ctx, serverID, actorID); err != nil {
		return err
	}
	if err := s.access.SetRoleActions(ctx, serverID, roleID, actions); err != nil {
		return err
	}
	s.broadcast(serverID, "event:access", map[string]string{"server_id": serverID})
	return nil
}
