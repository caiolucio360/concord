package websocket

import (
	"testing"

	"gin-quickstart/backend/internal/bot"
	"gin-quickstart/backend/internal/user"
)

// O Maestro não tem conexão de websocket, mas está sempre disponível: os
// outros o veem online (bolinha, lista de membros, perfil).
func TestMaestroAlwaysOnline(t *testing.T) {
	h := NewHub()
	if got := h.EffectiveStatus(bot.UserID); got != user.StatusOnline {
		t.Fatalf("status do Maestro = %q, want online", got)
	}
	if got := h.PresenceMap([]string{bot.UserID, "alguem"}); got[bot.UserID] != user.StatusOnline {
		t.Fatalf("presença = %v", got)
	}
	// Quem não está conectado continua offline.
	if got := h.EffectiveStatus("alguem"); got == user.StatusOnline {
		t.Fatalf("usuário desconectado não pode aparecer online: %q", got)
	}
}
