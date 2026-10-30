package liveobs

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"gin-quickstart/backend/internal/platform/ratelimit"

	"github.com/gin-gonic/gin"
)

// Limites do POST /obs/telemetry: o app manda um pedido a cada 20 s.
const (
	maxBodyBytes = 32 << 10
	perMinute    = 6
	limiterKeys  = 10_000
)

type reportSaver interface {
	Save(ctx context.Context, userID string, r Report) error
}

// TelemetryHandler recebe a telemetria das lives e calls.
type TelemetryHandler struct {
	store   reportSaver
	limiter *ratelimit.Limiter
}

func NewTelemetryHandler(store reportSaver) *TelemetryHandler {
	return &TelemetryHandler{store: store, limiter: ratelimit.New(perMinute, time.Minute, limiterKeys)}
}

// Ingest: POST /obs/telemetry. 204 = gravado (sessões de outra pessoa são puladas).
func (h *TelemetryHandler) Ingest(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	if retry, ok := h.limiter.Allow(userID); !ok {
		c.Header("Retry-After", ratelimit.RetryAfterSeconds(retry))
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many reports"})
		return
	}
	batch, err := decodeBatch(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.saveAll(c.Request.Context(), userID, batch); err != nil {
		log.Printf("[liveobs] telemetria de %s: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save"})
		return
	}
	c.Status(http.StatusNoContent)
}

func decodeBatch(c *gin.Context) (Batch, error) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBodyBytes)
	var b Batch
	if err := c.ShouldBindJSON(&b); err != nil {
		return b, errors.New("invalid body")
	}
	return b, b.Validate()
}

func (h *TelemetryHandler) saveAll(ctx context.Context, userID string, b Batch) error {
	for _, r := range b.Reports {
		if err := h.store.Save(ctx, userID, r); err != nil && !errors.Is(err, ErrNotOwner) {
			return err
		}
	}
	return nil
}
