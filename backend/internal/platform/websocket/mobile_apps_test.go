package websocket

import (
	"net/url"
	"testing"
)

func TestMobileApps(t *testing.T) {
	t.Run("conta as conexões do app do celular por pessoa", func(t *testing.T) {
		m := NewMobileApps()
		if m.IsOpen("u1") {
			t.Fatal("ninguém conectado ainda")
		}
		closeA := m.Track("u1")
		closeB := m.Track("u1")
		if !m.IsOpen("u1") || m.IsOpen("u2") {
			t.Fatal("u1 tem o app aberto, u2 não")
		}
		closeA()
		if !m.IsOpen("u1") {
			t.Fatal("ainda resta uma conexão do celular de u1")
		}
		closeB()
		if m.IsOpen("u1") {
			t.Fatal("as duas conexões fecharam")
		}
	})

	t.Run("fechar duas vezes não deixa o contador negativo", func(t *testing.T) {
		m := NewMobileApps()
		closeA := m.Track("u1")
		closeA()
		closeA()
		m.Track("u1")
		if !m.IsOpen("u1") {
			t.Fatal("uma conexão nova depois de fechar a antiga deve contar")
		}
	})

	t.Run("sem contador (nil) responde fechado e não quebra", func(t *testing.T) {
		var m *MobileApps
		m.Track("u1")()
		if m.IsOpen("u1") {
			t.Fatal("nil nunca tem app aberto")
		}
	})
}

func TestIsMobileClient(t *testing.T) {
	cases := map[string]bool{"client=mobile": true, "token=x&client=mobile": true, "token=x": false, "client=desktop": false}
	for raw, want := range cases {
		q, _ := url.ParseQuery(raw)
		if got := isMobileClient(q); got != want {
			t.Errorf("%q: got %v, want %v", raw, got, want)
		}
	}
}

func TestHandlerTrackMobile(t *testing.T) {
	h := (&Handler{}).WithMobileApps(NewMobileApps())
	desktop, _ := url.ParseQuery("token=x")
	h.trackMobile(desktop, "u1")
	if h.mobile.IsOpen("u1") {
		t.Fatal("conexão do desktop não conta como app do celular")
	}
	mobile, _ := url.ParseQuery("token=x&client=mobile")
	closeFn := h.trackMobile(mobile, "u1")
	if !h.mobile.IsOpen("u1") {
		t.Fatal("conexão do celular conta")
	}
	closeFn()
	if h.mobile.IsOpen("u1") {
		t.Fatal("ao fechar, deixa de contar")
	}
}
