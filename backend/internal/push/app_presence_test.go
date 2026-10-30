package push

import (
	"testing"
	"time"
)

type fakeApps map[string]bool

func (f fakeApps) IsOpen(id string) bool { return f[id] }

type fakeStatus map[string]string

func (f fakeStatus) EffectiveStatus(id string) string {
	if s, ok := f[id]; ok {
		return s
	}
	return "offline"
}

// O push vale para o celular: o desktop aberto na mesma conta não impede (antes ninguém com o desktop aberto
// recebia push no celular, porque a presença somava todos os aparelhos).
func TestAppPresence(t *testing.T) {
	notifierWith := func(r *rig, p Presence) *Notifier {
		return NewNotifier(Deps{
			Presence: p, Settings: r.settings, Directory: r.dir, Access: r.access,
			Tokens: r.tokens, Sender: r.sender, Run: func(f func()) { f() }, Now: func() time.Time { return fixedNow },
		})
	}

	t.Run("desktop aberto e app do celular fechado: o push sai", func(t *testing.T) {
		r := newRig()
		r.n = notifierWith(r, AppPresence{Mobile: fakeApps{}, Status: fakeStatus{"u-ana": "online"}})
		r.n.OnMessage(dmEvent("oi", "u-ana"))
		expectTokens(t, r, "tok-ana")
	})

	t.Run("app do celular aberto: não manda push (o aviso aparece dentro do app)", func(t *testing.T) {
		r := newRig()
		r.n = notifierWith(r, AppPresence{Mobile: fakeApps{"u-ana": true}, Status: fakeStatus{"u-ana": "online"}})
		r.n.OnMessage(dmEvent("oi", "u-ana"))
		expectTokens(t, r)
	})

	t.Run("Não perturbar continua sem push", func(t *testing.T) {
		r := newRig()
		r.n = notifierWith(r, AppPresence{Mobile: fakeApps{}, Status: fakeStatus{"u-ana": "dnd"}})
		r.n.OnMessage(dmEvent("oi", "u-ana"))
		expectTokens(t, r)
	})
}
