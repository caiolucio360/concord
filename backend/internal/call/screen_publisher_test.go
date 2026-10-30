package call

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"sort"
	"testing"
	"time"

	"gin-quickstart/backend/internal/permission"
	"gin-quickstart/backend/internal/platform/livekit"

	"github.com/gin-gonic/gin"
	"github.com/livekit/protocol/auth"
)

func screenTokenRouter(service *Service, userID string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	fakeAuth := func(c *gin.Context) {
		c.Set("userID", userID)
		c.Next()
	}
	handler := NewScreenTokenHandler(service, livekit.NewTokenIssuer("concord", testLiveKitSecret))
	ScreenPublisherRoutes(router.Group("/api"), handler, fakeAuth)
	return router
}

func postScreenToken(router *gin.Engine, callID string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/calls/"+callID+"/screen-token", nil))
	return rec
}

func TestScreenTokenPublishesOnlyTheScreenAsTheUser(t *testing.T) {
	service := serviceWithCall("call-1", "user-1")
	service.mediaName = func(context.Context, string) string { return "Ana" }

	rec := postScreenToken(screenTokenRouter(service, "user-1"), "call-1")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Token    string `json:"token"`
		Identity string `json:"identity"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Identity != "user-1:screen" {
		t.Fatalf("identity = %q, want user-1:screen", body.Identity)
	}
	verifier, err := auth.ParseAPIToken(body.Token)
	if err != nil {
		t.Fatal(err)
	}
	_, grants, err := verifier.Verify(testLiveKitSecret)
	if err != nil {
		t.Fatal(err)
	}
	v := grants.Video
	if grants.Identity != "user-1:screen" || grants.Name != "Ana" || v.Room != "call-1" || !v.RoomJoin {
		t.Fatalf("identidade/sala: %q %q %+v", grants.Identity, grants.Name, v)
	}
	if v.GetCanSubscribe() || v.GetCanPublishData() || !v.GetCanPublish() {
		t.Fatalf("só publica, sem assinar nem dados: %+v", v)
	}
	sources := append([]string{}, v.CanPublishSources...)
	sort.Strings(sources)
	if !reflect.DeepEqual(sources, []string{"screen_share", "screen_share_audio"}) {
		t.Fatalf("fontes = %v, want só a tela e o som dela", sources)
	}
}

func TestScreenTokenRequiresBeingInTheCall(t *testing.T) {
	rec := postScreenToken(screenTokenRouter(serviceWithCall("call-1", "user-1"), "intruso"), "call-1")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}
}

func TestScreenTokenRequiresStreamPermission(t *testing.T) {
	snap := voiceSnapshot().WithChannel("sem-live", permission.ChannelVoice,
		permission.Overwrite{TargetType: permission.TargetRole, TargetID: "everyone", Deny: permission.Stream},
	)
	svc, _, _ := newVoiceService(snap)
	putInCall(svc, "c1", "sem-live", "ana")

	rec := postScreenToken(screenTokenRouter(svc, "ana"), "c1")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403 (sem permissão de transmitir)", rec.Code)
	}
}

func TestScreenIdentityOwner(t *testing.T) {
	if got := ScreenIdentity("u1"); got != "u1:screen" {
		t.Fatalf("ScreenIdentity = %q", got)
	}
}

// Quem perde a permissão de transmitir perde também a live do helper (o token
// dela foi emitido antes e não muda sozinho).
func TestRevalidateRemovesScreenPublisherWithoutStream(t *testing.T) {
	snap := voiceSnapshot()
	svc, media, _ := newVoiceService(snap)
	putInCall(svc, "c1", "geral", "ana")
	snap.WithChannel("geral", permission.ChannelVoice,
		permission.Overwrite{TargetType: permission.TargetRole, TargetID: "everyone", Deny: permission.Stream},
	)

	svc.RevalidateServer(context.Background(), "srv-1")

	if !reflect.DeepEqual(media.removed, []string{"c1|ana:screen"}) {
		t.Fatalf("mídia removida: %v, want só a tela da ana", media.removed)
	}
	if !svc.IsParticipant("c1", "ana") {
		t.Fatal("a ana continua na chamada")
	}
}

func TestRevalidateKeepsScreenPublisherWithStream(t *testing.T) {
	svc, media, _ := newVoiceService(voiceSnapshot())
	putInCall(svc, "c1", "geral", "ana")

	svc.RevalidateServer(context.Background(), "srv-1")

	if len(media.removed) != 0 {
		t.Fatalf("ninguém devia sair da mídia: %v", media.removed)
	}
}

type removeCall struct{ room, identity string }

type chanMedia struct{ removed chan removeCall }

func (c chanMedia) UpdatePermissions(context.Context, string, string, livekit.Grant) error {
	return nil
}

func (c chanMedia) Remove(_ context.Context, room, identity string) error {
	c.removed <- removeCall{room, identity}
	return nil
}

func TestLeavingTheCallRemovesTheScreenPublisher(t *testing.T) {
	media := chanMedia{removed: make(chan removeCall, 1)}
	ScreenPublisherCleanup(media)("c1", "ana")

	select {
	case got := <-media.removed:
		if got != (removeCall{"c1", "ana:screen"}) {
			t.Fatalf("removeu %+v", got)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("a tela da ana devia sair da sala de mídia")
	}
}
