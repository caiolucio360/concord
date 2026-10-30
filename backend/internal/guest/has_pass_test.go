package guest

import (
	"context"
	"testing"
	"time"
)

// HasGuestPass: a mesa de áudio da call lista os sons do servidor para quem é
// visitante lá agora.
func TestHasGuestPassOnlyWhileTheAccessLasts(t *testing.T) {
	w := newWorld()
	inv := w.invite()
	if _, err := w.svc.JoinWithAccount(context.Background(), inv.Token, "bia"); err != nil {
		t.Fatal(err)
	}
	if !w.svc.HasGuestPass("srv", "bia") {
		t.Fatal("bia é visitante em srv")
	}
	if w.svc.HasGuestPass("outro", "bia") || w.svc.HasGuestPass("srv", "ana") {
		t.Fatal("só o servidor do acesso, só quem tem acesso")
	}
	w.now = w.now.Add(3 * time.Hour)
	if w.svc.HasGuestPass("srv", "bia") {
		t.Fatal("acesso vencido não vale")
	}
}
