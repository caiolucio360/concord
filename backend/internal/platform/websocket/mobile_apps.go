package websocket

import (
	"net/url"
	"sync"
)

// MobileApps conta as conexões do app do celular (o app abre o /ws com ?client=mobile). O push usa isto em
// vez da presença geral: com o desktop aberto na mesma conta o celular continua recebendo notificação.
type MobileApps struct {
	mu   sync.Mutex
	open map[string]int
}

func NewMobileApps() *MobileApps {
	return &MobileApps{open: make(map[string]int)}
}

// Track conta uma conexão do app do celular e devolve o "fechou" (chamar mais de uma vez não desconta de novo).
func (m *MobileApps) Track(userID string) func() {
	if m == nil {
		return func() {}
	}
	m.mu.Lock()
	m.open[userID]++
	m.mu.Unlock()
	var once sync.Once
	return func() {
		once.Do(func() {
			m.mu.Lock()
			defer m.mu.Unlock()
			if m.open[userID] <= 1 {
				delete(m.open, userID)
				return
			}
			m.open[userID]--
		})
	}
}

// IsOpen diz se a pessoa está com o app do celular aberto (alguma conexão dele).
func (m *MobileApps) IsOpen(userID string) bool {
	if m == nil {
		return false
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.open[userID] > 0
}

// isMobileClient: a conexão é do app do celular (?client=mobile).
func isMobileClient(q url.Values) bool {
	return q.Get("client") == "mobile"
}
