package liveobs

import "github.com/gin-gonic/gin"

// TelemetryRoutes: o app manda a telemetria (só conta com login; visitante não).
func TelemetryRoutes(router *gin.RouterGroup, handler *TelemetryHandler, authMiddleware gin.HandlerFunc) {
	router.POST("/obs/telemetry", authMiddleware, handler.Ingest)
}
