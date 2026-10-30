package call

import (
	"context"
	"log"
	"net/http"
	"time"

	"gin-quickstart/backend/internal/platform/livekit"

	"github.com/gin-gonic/gin"
)

// Live pelo motor nativo (docs/adr/0031): o helper Rust do app entra na sala
// da chamada como um participante só da tela, `<userId>:screen`, com um token
// que só publica a tela e o som dela (não assina ninguém, não manda dados).
// Quem assiste atribui essa live ao usuário dono.

const screenIdentitySuffix = ":screen"

// screenRemoveTimeout limita a remoção da tela na sala de mídia (feita fora
// da fila de quem saiu da chamada).
const screenRemoveTimeout = 5 * time.Second

// ScreenIdentity é a identidade do participante "tela" do usuário.
func ScreenIdentity(userID string) string { return userID + screenIdentitySuffix }

// ScreenTokenIssuer emite o JWT do participante "tela" (livekit.TokenIssuer).
type ScreenTokenIssuer interface {
	IssueScreen(room, identity, name string) (string, error)
}

// screenCalls é o que a rota usa da chamada.
type screenCalls interface {
	IsParticipant(callID, userID string) bool
	GrantFor(ctx context.Context, callID, userID string) livekit.Grant
}

type ScreenTokenHandler struct {
	calls  screenCalls
	tokens ScreenTokenIssuer
	name   func(ctx context.Context, userID string) string
}

func NewScreenTokenHandler(service *Service, tokens ScreenTokenIssuer) *ScreenTokenHandler {
	return &ScreenTokenHandler{
		calls:  service,
		tokens: tokens,
		name:   func(ctx context.Context, userID string) string { return service.mediaName(ctx, userID) },
	}
}

// ScreenPublisherRoutes: só o app logado pede (o visitante transmite pelo navegador).
func ScreenPublisherRoutes(router *gin.RouterGroup, handler *ScreenTokenHandler, authMiddleware gin.HandlerFunc) {
	router.POST("/calls/:id/screen-token", authMiddleware, handler.Token)
}

// Token: só quem está na chamada e pode transmitir nela.
func (h *ScreenTokenHandler) Token(c *gin.Context) {
	callID := c.Param("id")
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	ctx := c.Request.Context()
	if !h.calls.IsParticipant(callID, userID) || h.calls.GrantFor(ctx, callID, userID).NoStream {
		c.JSON(http.StatusForbidden, gin.H{"error": ErrNotAllowed.Error()})
		return
	}
	identity := ScreenIdentity(userID)
	token, err := h.tokens.IssueScreen(callID, identity, h.name(ctx, userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue media token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token, "identity": identity})
}

// ScreenPublisherCleanup é o gancho de saída da chamada (OnParticipantLeft):
// quem saiu (ou foi tirado) não deixa a tela do helper na sala.
func ScreenPublisherCleanup(media MediaAdmin) func(callID, userID string) {
	return func(callID, userID string) {
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), screenRemoveTimeout)
			defer cancel()
			removeScreenPublisher(ctx, media, callID, userID)
		}()
	}
}

// dropScreenWithoutStream: perdeu a permissão de transmitir → a tela do helper sai.
func dropScreenWithoutStream(ctx context.Context, media MediaAdmin, callID, userID string, g livekit.Grant) {
	if g.NoStream {
		removeScreenPublisher(ctx, media, callID, userID)
	}
}

// removeScreenPublisher tira a tela da sala; sem ela na sala o LiveKit
// responde "não encontrado", que não é erro aqui.
func removeScreenPublisher(ctx context.Context, media MediaAdmin, callID, userID string) {
	if err := media.Remove(ctx, callID, ScreenIdentity(userID)); err != nil && !livekit.IsNotFound(err) {
		log.Printf("[call] remove screen of %s from media room %s failed: %v", userID, callID, err)
	}
}
