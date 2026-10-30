package call

import (
	"context"
	"errors"
	"testing"

	"gin-quickstart/backend/internal/permission"
)

// Visitante na call do convite usa trancar, mesa de áudio e atividades como
// qualquer participante (ADR 0017, emenda de 2026-10-29).

func guestSounds() fakeSoundLookup {
	return fakeSoundLookup{
		sounds: map[string]SoundInfo{
			"buzina": {ID: "buzina", ServerID: "srv-1", Name: "Buzina"},
			"alheio": {ID: "alheio", ServerID: "srv-2", Name: "Alheio"},
			"fav":    {ID: "fav", ServerID: "srv-2", Name: "Favorito"},
		},
		favorites: map[string]bool{"visita:fav": true},
	}
}

func TestGuestLocksTheRoomAndOpensActivities(t *testing.T) {
	svc, _, _, _ := newGuestService()
	putInCall(svc, "c1", "geral", "visita", "ana")
	ctx := context.Background()

	if err := svc.SetLocked(ctx, "c1", "visita", true); err != nil {
		t.Fatalf("visitante tranca a sala: %v", err)
	}
	if err := svc.StartActivity(ctx, "c1", "visita", "krunker", ""); err != nil {
		t.Fatalf("visitante abre atividade: %v", err)
	}
	if err := svc.StopActivity("c1", "visita"); err != nil {
		t.Fatalf("visitante encerra a atividade que abriu: %v", err)
	}
	// Fora da call dele, nada.
	putInCall(svc, "c2", "jogos", "bia")
	if err := svc.SetLocked(ctx, "c2", "visita", true); !errors.Is(err, ErrNotAllowed) {
		t.Fatalf("trancar outra call: err = %v, want ErrNotAllowed", err)
	}
}

func TestGuestPlaysServerSoundsAndOwnFavorites(t *testing.T) {
	svc, _, _, pub := newGuestService()
	svc.SetSoundLookup(guestSounds())
	putInCall(svc, "c1", "geral", "visita", "ana")
	ctx := context.Background()

	if err := svc.TriggerSoundboard(ctx, "c1", "visita", "buzina"); err != nil {
		t.Fatalf("som do servidor da call: %v", err)
	}
	svc.calls["c1"].participants["visita"].lastSoundAt = svc.calls["c1"].participants["visita"].lastSoundAt.Add(-soundboardCooldown)
	if err := svc.TriggerSoundboard(ctx, "c1", "visita", "fav"); err != nil {
		t.Fatalf("favorito do visitante: %v", err)
	}
	svc.calls["c1"].participants["visita"].lastSoundAt = svc.calls["c1"].participants["visita"].lastSoundAt.Add(-soundboardCooldown)
	if err := svc.TriggerSoundboard(ctx, "c1", "visita", "alheio"); !errors.Is(err, ErrSoundNotFound) {
		t.Fatalf("som de outro servidor sem favoritar: err = %v, want ErrSoundNotFound", err)
	}
	if n := len(pub.callEvents["c1"]); n != 2 {
		t.Fatalf("eventos na call = %d, want 2 sons", n)
	}
}

func TestGuestSoundboardFollowsEveryoneInTheChannel(t *testing.T) {
	snap := voiceSnapshot().WithChannel("quieto", permission.ChannelVoice,
		permission.Overwrite{TargetType: permission.TargetRole, TargetID: "everyone", Deny: permission.UseSoundboard},
	)
	svc, _, _ := newVoiceService(snap)
	svc.SetGuests(&fakeGuests{passes: map[string]guestPass{
		"visita": {serverID: "srv-1", channelID: "quieto"},
		"outra":  {serverID: "srv-1", channelID: "geral"},
	}})
	svc.SetSoundLookup(guestSounds())
	putInCall(svc, "c1", "quieto", "visita", "ana")
	putInCall(svc, "c2", "geral", "outra", "bia")
	ctx := context.Background()

	if err := svc.TriggerSoundboard(ctx, "c1", "visita", "buzina"); !errors.Is(err, ErrSoundboardNoPermission) {
		t.Fatalf("@everyone sem mesa no canal: err = %v, want ErrSoundboardNoPermission", err)
	}
	if err := svc.TriggerSoundboard(ctx, "c2", "outra", "buzina"); err != nil {
		t.Fatalf("@everyone com mesa no canal: %v", err)
	}
}
