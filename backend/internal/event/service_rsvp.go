package event

import "context"

// liveEvent: o evento, se quem pede é membro e ele ainda não terminou.
func (s *Service) liveEvent(ctx context.Context, serverID, eventID, userID string) (*Event, error) {
	if err := s.requireMember(ctx, serverID, userID); err != nil {
		return nil, err
	}
	e, err := s.store.Find(ctx, serverID, eventID)
	if err != nil {
		return nil, err
	}
	if e.CanceledAt != nil {
		return nil, ErrEventNotFound
	}
	if e.FinishedAt != nil {
		return nil, ErrEventEnded
	}
	return e, nil
}

// SetRSVP registra "vou" ou "não vou" para a ocorrência atual.
func (s *Service) SetRSVP(ctx context.Context, serverID, eventID, userID string, going bool) error {
	e, err := s.liveEvent(ctx, serverID, eventID, userID)
	if err != nil {
		return err
	}
	return s.store.SetRSVP(ctx, e.ID, userID, e.NextStartAt, going)
}

// ClearRSVP tira a resposta da ocorrência atual (sem resposta = sem aviso).
func (s *Service) ClearRSVP(ctx context.Context, serverID, eventID, userID string) error {
	e, err := s.liveEvent(ctx, serverID, eventID, userID)
	if err != nil {
		return err
	}
	return s.store.ClearRSVP(ctx, e.ID, userID, e.NextStartAt)
}

// ListGoing: quem vai na ocorrência atual.
func (s *Service) ListGoing(ctx context.Context, serverID, eventID, userID string) ([]Going, error) {
	e, err := s.liveEvent(ctx, serverID, eventID, userID)
	if err != nil {
		return nil, err
	}
	return s.store.ListGoing(ctx, e.ID, e.NextStartAt)
}
