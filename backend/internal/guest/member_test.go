package guest

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"
)

// visitInCall: bia entra pelo link com a conta e está na call da sala.
func visitInCall(t *testing.T, w *world) *CreatedInvite {
	t.Helper()
	inv := w.invite()
	if _, err := w.svc.JoinWithAccount(context.Background(), inv.Token, "bia"); err != nil {
		t.Fatal(err)
	}
	w.calls.in["bia"] = "sala"
	return inv
}

// Regressão: quem entrou como visitante e depois aceitou o convite do servidor
// ficava com as duas entradas (visita e servidor). Virar membro encerra o
// acesso de visitante sem tirar a pessoa da call.
func TestBecomingMemberEndsTheVisitButKeepsTheCall(t *testing.T) {
	w := newWorld()
	inv := visitInCall(t, w)
	ctx := context.Background()

	w.snap.WithMember("bia")
	w.svc.MemberJoined(ctx, "srv", "bia")

	if w.svc.HasGuestPass("srv", "bia") || w.svc.GuestOf("bia") != "" {
		t.Fatal("o acesso de visitante tinha que acabar")
	}
	if _, ok := w.svc.GuestChannelPerms(ctx, "sala", "bia"); ok {
		t.Fatal("a call não pode mais tratá-la como visitante")
	}
	if p, _ := w.store.PassFor(ctx, inv.ID, "bia"); p == nil || p.EndedAt == nil {
		t.Fatal("o acesso fica encerrado no banco (não volta na subida)")
	}
	if len(w.calls.removed) != 0 {
		t.Fatalf("virar membro não tira da call: %v", w.calls.removed)
	}
	if strings.Join(w.calls.members, ",") != "srv|bia" {
		t.Fatalf("a chamada tem que saber que virou membro: %v", w.calls.members)
	}
	ended := w.notify.sent["bia"]
	if last := ended[len(ended)-1]; !strings.Contains(last, `"guest:ended"`) || !strings.Contains(last, `"reason":"member"`) {
		t.Fatalf("os apps dela recebem o fim da visita por virar membro: %s", last)
	}
	// O fluxo de visitante não vale mais para ela.
	if _, err := w.svc.JoinWithAccount(ctx, inv.Token, "bia"); !errors.Is(err, ErrAlreadyMember) {
		t.Fatalf("link de visitante sendo membro: err = %v, want ErrAlreadyMember", err)
	}
	if got := w.svc.Passes(ctx, "bia"); len(got) != 0 {
		t.Fatalf("sem visitas: %v", got)
	}
}

// O acesso vencido que o sweep ainda não encerrou também acaba ao virar membro:
// senão o sweep tiraria o novo membro da call.
func TestBecomingMemberAfterExpiryIsNotKickedBySweep(t *testing.T) {
	w := newWorld()
	visitInCall(t, w)
	w.now = w.now.Add(3 * time.Hour)
	w.snap.WithMember("bia")
	w.svc.MemberJoined(context.Background(), "srv", "bia")
	w.svc.Sweep(context.Background())
	if len(w.calls.removed) != 0 {
		t.Fatalf("o sweep não pode tirar o novo membro da call: %v", w.calls.removed)
	}
}

func TestMemberJoinedWithoutVisitDoesNothing(t *testing.T) {
	w := newWorld()
	w.svc.MemberJoined(context.Background(), "srv", "novo")
	if len(w.calls.members) != 0 || len(w.notify.sent["novo"]) != 0 {
		t.Fatal("quem não era visitante não gera evento")
	}
}
