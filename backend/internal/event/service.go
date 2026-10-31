package event

import (
	"context"
	"fmt"
	"time"

	"gin-quickstart/backend/internal/permission"

	"github.com/google/uuid"
)

// store é o que o service usa do repositório.
type store interface {
	Create(ctx context.Context, e *Event, reminders []ReminderRow) error
	Update(ctx context.Context, e *Event, reminders []ReminderRow) error
	Cancel(ctx context.Context, serverID, eventID string) error
	Find(ctx context.Context, serverID, eventID string) (*Event, error)
	ListUpcoming(ctx context.Context, serverID, userID string) ([]Event, error)
	IsVoiceChannel(ctx context.Context, serverID, channelID string) (bool, error)
	SetRSVP(ctx context.Context, eventID, userID string, occurrence time.Time, going bool) error
	ClearRSVP(ctx context.Context, eventID, userID string, occurrence time.Time) error
	ListGoing(ctx context.Context, eventID string, occurrence time.Time) ([]Going, error)
}

type permChecker interface {
	ServerPerms(ctx context.Context, serverID, userID string) (int64, error)
}

type memberChecker interface {
	IsMember(ctx context.Context, serverID, userID string) (bool, error)
}

type publisher interface {
	BroadcastToRoom(room string, event []byte)
}

type Service struct {
	store   store
	perms   permChecker
	members memberChecker
	pub     publisher
	now     func() time.Time
}

func NewService(s store, p permChecker, m memberChecker, pub publisher) *Service {
	return &Service{store: s, perms: p, members: m, pub: pub, now: time.Now}
}

// requireManage: quem pode criar, editar e cancelar (o Administrador e o dono
// já vêm com todos os bits em ServerPerms).
func (s *Service) requireManage(ctx context.Context, serverID, userID string) error {
	perms, err := s.perms.ServerPerms(ctx, serverID, userID)
	if err != nil {
		return fmt.Errorf("conferir permissões: %w", err)
	}
	if !permission.Has(perms, permission.ManageEvents) {
		return ErrMissingPermission
	}
	return nil
}

func (s *Service) checkChannel(ctx context.Context, serverID, channelID string) error {
	ok, err := s.store.IsVoiceChannel(ctx, serverID, channelID)
	if err != nil {
		return fmt.Errorf("conferir canal: %w", err)
	}
	if !ok {
		return ErrInvalidChannel
	}
	return nil
}

// Create cria o evento (e os avisos da primeira ocorrência) de quem tem
// Gerenciar eventos.
func (s *Service) Create(ctx context.Context, serverID, actorID string, in Input) (*Event, error) {
	if err := s.requireManage(ctx, serverID, actorID); err != nil {
		return nil, err
	}
	in, err := in.normalize(s.now())
	if err != nil {
		return nil, err
	}
	if err := s.checkChannel(ctx, serverID, in.ChannelID); err != nil {
		return nil, err
	}
	e := newEvent(serverID, actorID, in)
	if err := s.store.Create(ctx, e, reminderRows(e.NextStartAt, e.ReminderOffsets, s.now())); err != nil {
		return nil, fmt.Errorf("gravar evento: %w", err)
	}
	s.broadcast(serverID, "event:create", e)
	return e, nil
}

func newEvent(serverID, actorID string, in Input) *Event {
	e := &Event{ID: uuid.NewString(), ServerID: serverID, Scope: "server", CreatedBy: &actorID}
	e.apply(in)
	return e
}

// apply passa o pedido já limpo para o evento e volta à primeira ocorrência.
func (e *Event) apply(in Input) {
	e.ChannelID, e.Title, e.Description, e.BannerID = in.ChannelID, in.Title, in.Description, in.BannerID
	e.StartsAt, e.NextStartAt, e.OccurrencesDone = in.StartsAt, in.StartsAt, 0
	e.Recurrence, e.RecurrenceUntil, e.RecurrenceCount = in.Recurrence, in.RecurrenceUntil, in.RecurrenceCount
	e.ReminderOffsets = in.ReminderOffsets
}

// Update troca os dados do evento vivo. Mudar o evento recomeça da primeira
// ocorrência e refaz os avisos.
func (s *Service) Update(ctx context.Context, serverID, eventID, actorID string, in Input) (*Event, error) {
	if err := s.requireManage(ctx, serverID, actorID); err != nil {
		return nil, err
	}
	e, err := s.editable(ctx, serverID, eventID)
	if err != nil {
		return nil, err
	}
	in, err = in.normalize(s.now())
	if err != nil {
		return nil, err
	}
	if err := s.checkChannel(ctx, serverID, in.ChannelID); err != nil {
		return nil, err
	}
	e.apply(in)
	if err := s.store.Update(ctx, e, reminderRows(e.NextStartAt, e.ReminderOffsets, s.now())); err != nil {
		return nil, fmt.Errorf("atualizar evento: %w", err)
	}
	s.broadcast(serverID, "event:update", e)
	return e, nil
}

// editable: o evento, se ainda está vivo (nem cancelado nem encerrado).
func (s *Service) editable(ctx context.Context, serverID, eventID string) (*Event, error) {
	e, err := s.store.Find(ctx, serverID, eventID)
	if err != nil {
		return nil, err
	}
	if e.CanceledAt != nil || e.FinishedAt != nil {
		return nil, ErrEventNotFound
	}
	return e, nil
}

// Cancel cancela o evento e os avisos que ainda não saíram.
func (s *Service) Cancel(ctx context.Context, serverID, eventID, actorID string) error {
	if err := s.requireManage(ctx, serverID, actorID); err != nil {
		return err
	}
	if _, err := s.editable(ctx, serverID, eventID); err != nil {
		return err
	}
	if err := s.store.Cancel(ctx, serverID, eventID); err != nil {
		return fmt.Errorf("cancelar evento: %w", err)
	}
	s.broadcast(serverID, "event:delete", map[string]string{"server_id": serverID, "event_id": eventID})
	return nil
}

// List devolve os eventos vivos do servidor para quem é membro.
func (s *Service) List(ctx context.Context, serverID, userID string) ([]Event, error) {
	if err := s.requireMember(ctx, serverID, userID); err != nil {
		return nil, err
	}
	return s.store.ListUpcoming(ctx, serverID, userID)
}

func (s *Service) requireMember(ctx context.Context, serverID, userID string) error {
	ok, err := s.members.IsMember(ctx, serverID, userID)
	if err != nil {
		return fmt.Errorf("conferir membro: %w", err)
	}
	if !ok {
		return ErrNotMember
	}
	return nil
}

func (s *Service) broadcast(serverID, typ string, payload any) {
	if s.pub != nil {
		s.pub.BroadcastToRoom("server:"+serverID, marshalEvent(typ, payload))
	}
}
