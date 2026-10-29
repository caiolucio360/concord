package emoji

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/gin-gonic/gin"
)

// fakeEmojibase serve um compact.json e um messages.json mínimos e conta os pedidos.
func fakeEmojibase(t *testing.T, hits *atomic.Int32, fail bool) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		if fail {
			http.Error(w, "fora do ar", http.StatusBadGateway)
			return
		}
		switch r.URL.Path {
		case "/compact.json":
			_, _ = w.Write([]byte(`[
				{"group":0,"label":"rosto risonho","order":2,"tags":["feliz"],"unicode":"😀"},
				{"group":2,"label":"pele clara","order":3,"unicode":"🏻"},
				{"label":"sem grupo","order":4,"unicode":"🇦"},
				{"group":0,"label":"rosto sorridente","order":1,"tags":["riso"],"unicode":"😃"},
				{"group":1,"label":"mão acenando","order":5,"unicode":"👋"}
			]`))
		case "/messages.json":
			_, _ = w.Write([]byte(`{"groups":[
				{"key":"smileys-emotion","message":"sorrisos e emoção","order":0},
				{"key":"people-body","message":"pessoas e corpo","order":1},
				{"key":"component","message":"componentes","order":2}
			]}`))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestBasePackEnxugaOrdenaECacheia(t *testing.T) {
	var hits atomic.Int32
	svc := NewBaseService(fakeEmojibase(t, &hits, false).URL)

	body, etag, err := svc.Payload(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	var pack BasePack
	if err := json.Unmarshal(body, &pack); err != nil {
		t.Fatal(err)
	}
	if len(pack.Groups) != 2 || pack.Groups[0].Name != "sorrisos e emoção" {
		t.Fatalf("grupos = %+v (componentes ficam de fora)", pack.Groups)
	}
	got := []string{}
	for _, e := range pack.Emojis {
		got = append(got, e.Emoji)
	}
	if len(got) != 3 || got[0] != "😃" || got[1] != "😀" || got[2] != "👋" {
		t.Fatalf("emojis = %v, want [😃 😀 👋] (ordenados, sem componente nem sem grupo)", got)
	}
	if pack.Emojis[0].Keywords[0] != "riso" || pack.Emojis[2].Group != 1 {
		t.Fatalf("campos errados: %+v", pack.Emojis)
	}
	if etag == "" {
		t.Fatal("sem ETag")
	}

	before := hits.Load()
	if _, again, err := svc.Payload(context.Background()); err != nil || again != etag {
		t.Fatalf("segunda chamada: %v %q", err, again)
	}
	if hits.Load() != before {
		t.Fatal("segunda chamada buscou de novo no CDN")
	}
}

func TestBasePackFalhaNaoFicaGuardada(t *testing.T) {
	var hits atomic.Int32
	svc := NewBaseService(fakeEmojibase(t, &hits, true).URL)
	if _, _, err := svc.Payload(context.Background()); err == nil {
		t.Fatal("esperava erro com o CDN fora")
	}
	before := hits.Load()
	_, _, _ = svc.Payload(context.Background())
	if hits.Load() == before {
		t.Fatal("depois de falhar, tem que tentar de novo")
	}
}

func TestBaseHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	var hits atomic.Int32
	h := NewBaseHandler(NewBaseService(fakeEmojibase(t, &hits, false).URL))
	r := gin.New()
	r.GET("/base", h.Serve)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/base", nil))
	if w.Code != http.StatusOK || w.Header().Get("Content-Type") != "application/json; charset=utf-8" {
		t.Fatalf("status %d, %q", w.Code, w.Header().Get("Content-Type"))
	}
	etag := w.Header().Get("ETag")

	req := httptest.NewRequest(http.MethodGet, "/base", nil)
	req.Header.Set("If-None-Match", etag)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusNotModified || w.Body.Len() != 0 {
		t.Fatalf("If-None-Match: status %d, corpo %d bytes", w.Code, w.Body.Len())
	}

	down := NewBaseHandler(NewBaseService(fakeEmojibase(t, &hits, true).URL))
	r2 := gin.New()
	r2.GET("/base", down.Serve)
	w = httptest.NewRecorder()
	r2.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/base", nil))
	if w.Code != http.StatusBadGateway {
		t.Fatalf("CDN fora: status %d", w.Code)
	}
}
