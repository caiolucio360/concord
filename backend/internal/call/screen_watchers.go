package call

import (
	"context"
	"errors"
	"sort"
)

var (
	ErrStreamNotActive = errors.New("stream_not_active")
)

// SetScreenWatching registra que watcherID está (ou deixou de estar) assistindo
// à transmissão de sharerID e avisa todos na chamada via call:screen_watchers.
func (s *Service) SetScreenWatching(ctx context.Context, callID, sharerID, watcherID string, watching bool) error {
	s.mu.Lock()
	ac, ok := s.calls[callID]
	if !ok {
		s.mu.Unlock()
		return ErrNotFound
	}
	if _, ok := ac.participants[watcherID]; !ok {
		s.mu.Unlock()
		return ErrNotAllowed
	}
	changed := false
	if !watching {
		changed = ac.removeScreenWatcher(sharerID, watcherID)
	} else if _, active := s.screenSharers[callID][sharerID]; active {
		changed = ac.addScreenWatcher(sharerID, watcherID)
	}
	// Transmissão que o servidor não conhece (o app antigo do celular transmitia sem avisar call:screen) cai aqui
	// sem erro: o call:error encerraria a chamada de quem só quis assistir.
	if !changed {
		s.mu.Unlock()
		return nil
	}
	watcherIDs := ac.screenWatcherIDs(sharerID)
	s.mu.Unlock()

	watchers := s.resolveWatchersInfo(ctx, watcherIDs)
	s.publisher.BroadcastToCall(callID, marshalEvent("call:screen_watchers", ScreenWatchersEvent{
		CallID:   callID,
		SharerID: sharerID,
		Watchers: watchers,
	}))
	return nil
}

// addScreenWatcher marca watcherID assistindo sharerID; false se já estava. Com s.mu travado.
func (ac *activeCall) addScreenWatcher(sharerID, watcherID string) bool {
	if ac.screenWatchers == nil {
		ac.screenWatchers = make(map[string]map[string]struct{})
	}
	if ac.screenWatchers[sharerID] == nil {
		ac.screenWatchers[sharerID] = make(map[string]struct{})
	}
	if _, already := ac.screenWatchers[sharerID][watcherID]; already {
		return false
	}
	ac.screenWatchers[sharerID][watcherID] = struct{}{}
	return true
}

// removeScreenWatcher tira watcherID de quem assiste sharerID; false se não estava. Com s.mu travado.
func (ac *activeCall) removeScreenWatcher(sharerID, watcherID string) bool {
	watchers := ac.screenWatchers[sharerID]
	if _, in := watchers[watcherID]; !in {
		return false
	}
	delete(watchers, watcherID)
	if len(watchers) == 0 {
		delete(ac.screenWatchers, sharerID)
	}
	return true
}

// screenWatcherIDs: quem assiste sharerID, em ordem. Com s.mu travado.
func (ac *activeCall) screenWatcherIDs(sharerID string) []string {
	ids := make([]string, 0, len(ac.screenWatchers[sharerID]))
	for wid := range ac.screenWatchers[sharerID] {
		ids = append(ids, wid)
	}
	sort.Strings(ids)
	return ids
}

// resolveWatchersInfo busca os dados de perfil (nome, foto) de cada espectador.
func (s *Service) resolveWatchersInfo(ctx context.Context, userIDs []string) []UserInfo {
	watchers := make([]UserInfo, 0, len(userIDs))
	for _, uid := range userIDs {
		info, err := s.lookupUser(ctx, uid)
		if err != nil {
			watchers = append(watchers, UserInfo{
				ID:          uid,
				Username:    uid,
				DisplayName: uid,
			})
			continue
		}
		watchers = append(watchers, info)
	}
	return watchers
}

// dropScreenWatcherLocked remove o participante que saiu de todas as transmissões
// que ele estava assistindo. Devolve um mapa sharerID -> []watcherIDs para broadcast.
func dropScreenWatcherLocked(ac *activeCall, watcherID string) map[string][]string {
	if ac.screenWatchers == nil {
		return nil
	}
	affected := make(map[string][]string)
	for sharerID, watchers := range ac.screenWatchers {
		if _, ok := watchers[watcherID]; ok {
			delete(watchers, watcherID)
			remaining := make([]string, 0, len(watchers))
			for wid := range watchers {
				remaining = append(remaining, wid)
			}
			sort.Strings(remaining)
			affected[sharerID] = remaining
			if len(watchers) == 0 {
				delete(ac.screenWatchers, sharerID)
			}
		}
	}
	return affected
}

// clearSharerWatchersLocked limpa os espectadores de quem parou de transmitir tela.
func clearSharerWatchersLocked(ac *activeCall, sharerID string) bool {
	if ac.screenWatchers == nil {
		return false
	}
	if _, ok := ac.screenWatchers[sharerID]; ok {
		delete(ac.screenWatchers, sharerID)
		return true
	}
	return false
}

// collectScreenWatchersSnapshotLocked obtém uma cópia dos IDs de espectadores
// para ser usada fora do lock com resolveWatchersInfo.
func collectScreenWatchersSnapshotLocked(ac *activeCall) map[string][]string {
	if ac.screenWatchers == nil || len(ac.screenWatchers) == 0 {
		return nil
	}
	result := make(map[string][]string, len(ac.screenWatchers))
	for sharerID, watchers := range ac.screenWatchers {
		ids := make([]string, 0, len(watchers))
		for wid := range watchers {
			ids = append(ids, wid)
		}
		sort.Strings(ids)
		result[sharerID] = ids
	}
	return result
}
