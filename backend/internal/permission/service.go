package permission

import (
	"context"
	"time"
)

// store é o que o Service usa do Repository (nos testes, um fake em memória).
type store interface {
	LoadSnapshot(ctx context.Context, serverID string) (*Snapshot, error)
	ChannelServerID(ctx context.Context, channelID string) (string, error)
}

type Service struct {
	store store
	cache *snapshotCache
}

// loadTimeout limita a leitura compartilhada: ela não segue o contexto de
// quem a começou (cancelar um pedido não derruba os outros que esperam).
const loadTimeout = 10 * time.Second

func PermissionService(repository *Repository) *Service {
	return NewService(repository)
}

// NewService aceita qualquer store (o fake dos testes de outros pacotes usa
// StaticStore).
func NewService(s store) *Service {
	return &Service{store: s, cache: newSnapshotCache()}
}

// Snapshot: as permissões do servidor, do cache (só leitura: é compartilhado).
func (s *Service) Snapshot(ctx context.Context, serverID string) (*Snapshot, error) {
	snap, load, leader := s.cache.begin(serverID)
	if snap != nil {
		return snap, nil
	}
	if leader {
		loadCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), loadTimeout)
		snap, err := s.store.LoadSnapshot(loadCtx, serverID)
		cancel()
		s.cache.finish(serverID, load, snap, err)
		return snap, err
	}
	select {
	case <-load.done:
		return load.snap, load.err
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

// ChannelSnapshot: o snapshot do servidor do canal.
func (s *Service) ChannelSnapshot(ctx context.Context, channelID string) (*Snapshot, error) {
	serverID, ok := s.cache.serverOf(channelID)
	if !ok {
		var err error
		if serverID, err = s.store.ChannelServerID(ctx, channelID); err != nil {
			return nil, err
		}
	}
	return s.Snapshot(ctx, serverID)
}

// InvalidateServer: cargos, membros, canais ou sobrescritas do servidor
// mudaram (chamar depois do commit). A próxima checagem lê do banco.
func (s *Service) InvalidateServer(serverID string) {
	s.cache.invalidate(serverID)
}

// InvalidateChannel: as sobrescritas do canal mudaram ou ele foi apagado.
func (s *Service) InvalidateChannel(channelID string) {
	s.cache.invalidateChannel(channelID)
}

func (s *Service) ServerPerms(ctx context.Context, serverID, userID string) (int64, error) {
	snap, err := s.Snapshot(ctx, serverID)
	if err != nil {
		return 0, err
	}
	if !snap.IsMember(userID) {
		return 0, ErrNotMember
	}
	return snap.Server(userID), nil
}

func (s *Service) ChannelPerms(ctx context.Context, channelID, userID string) (int64, error) {
	snap, err := s.ChannelSnapshot(ctx, channelID)
	if err != nil {
		return 0, err
	}
	if !snap.IsMember(userID) {
		return 0, ErrNotMember
	}
	return snap.Channel(channelID, userID), nil
}

// Require: o membro tem todos os bits de want no servidor.
func (s *Service) Require(ctx context.Context, serverID, userID string, want int64) error {
	perms, err := s.ServerPerms(ctx, serverID, userID)
	if err != nil {
		return err
	}
	if !Has(perms, want) {
		return ErrMissingPermission
	}
	return nil
}

// RequireChannel: o membro tem todos os bits de want no canal.
func (s *Service) RequireChannel(ctx context.Context, channelID, userID string, want int64) error {
	perms, err := s.ChannelPerms(ctx, channelID, userID)
	if err != nil {
		return err
	}
	if !Has(perms, want) {
		return ErrMissingPermission
	}
	return nil
}

// StaticStore é um store em memória com snapshots prontos, para testes de
// outros pacotes montarem permissões sem banco.
type StaticStore struct {
	Snapshots map[string]*Snapshot
}

func (f *StaticStore) LoadSnapshot(_ context.Context, serverID string) (*Snapshot, error) {
	snap, ok := f.Snapshots[serverID]
	if !ok {
		return nil, ErrNotMember
	}
	return snap, nil
}

func (f *StaticStore) ChannelServerID(_ context.Context, channelID string) (string, error) {
	for id, snap := range f.Snapshots {
		if _, ok := snap.Channels[channelID]; ok {
			return id, nil
		}
	}
	return "", ErrChannelNotFound
}
