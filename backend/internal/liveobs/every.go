package liveobs

import (
	"context"
	"log"
	"time"
)

// every roda fn a cada intervalo até ctx acabar; erros só vão para o log.
func every(ctx context.Context, interval time.Duration, what string, fn func(context.Context) error) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := fn(ctx); err != nil {
				log.Printf("[liveobs] %s: %v", what, err)
			}
		}
	}
}
