package event

import "github.com/gin-gonic/gin"

// Routes registra as rotas dos eventos do servidor.
func Routes(router *gin.RouterGroup, h *Handler, authMiddleware gin.HandlerFunc) {
	events := router.Group("/servers/:id/events")
	events.Use(authMiddleware)
	{
		events.GET("", h.List)
		events.POST("", h.Create)
		events.PATCH("/:eventId", h.Update)
		events.DELETE("/:eventId", h.Cancel)
		events.PUT("/:eventId/rsvp", h.SetRSVP)
		events.DELETE("/:eventId/rsvp", h.ClearRSVP)
		events.GET("/:eventId/rsvps", h.ListGoing)
	}
}
