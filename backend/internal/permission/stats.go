package permission

import (
	"context"
	"fmt"
	"math/rand/v2"
	"sync/atomic"
	"time"
)

// CacheStats: contadores do cache de permissões desde o boot.
type CacheStats struct {
	Hits          int64 // snapshot servido do cache
	Loads         int64 // idas ao banco (LoadSnapshot)
	Shared        int64 // pedidos que esperaram a leitura de outro
	Invalidations int64
	Servers       int64 // servidores no cache agora
}

type cacheCounters struct {
	// hits conta em todo pedido: fatiado para os núcleos não disputarem a
	// mesma linha de cache (um atomic.Int64 só deixava o acerto 7x mais lento
	// com 16 threads). Os outros são raros.
	hits                         shardedCounter
	loads, shared, invalidations atomic.Int64
}

// hitShards: potência de 2, mais que os núcleos da VPS.
const hitShards = 32

// shardedCounter: cada Add cai numa fatia sorteada (rand/v2 tem gerador por
// núcleo, sem lock); Load soma as fatias.
type shardedCounter struct {
	shards [hitShards]paddedCounter
}

type paddedCounter struct {
	n atomic.Int64
	_ [56]byte // uma fatia por linha de cache de 64 bytes
}

func (c *shardedCounter) Add(n int64) {
	c.shards[rand.Uint32()&(hitShards-1)].n.Add(n)
}

func (c *shardedCounter) Load() int64 {
	var total int64
	for i := range c.shards {
		total += c.shards[i].n.Load()
	}
	return total
}

// Stats: os contadores agora.
func (s *Service) Stats() CacheStats {
	c := s.cache
	var servers int64
	c.snaps.Range(func(_, _ any) bool {
		servers++
		return true
	})
	return CacheStats{
		Hits:          c.stats.hits.Load(),
		Loads:         c.stats.loads.Load(),
		Shared:        c.stats.shared.Load(),
		Invalidations: c.stats.invalidations.Load(),
		Servers:       servers,
	}
}

// LogStatsEvery loga o movimento do cache a cada intervalo (nada quando não
// houve), até ctx acabar.
func (s *Service) LogStatsEvery(ctx context.Context, interval time.Duration, logf func(format string, args ...any)) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	prev := CacheStats{}
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			cur := s.Stats()
			if line, ok := statsLine(prev, cur); ok {
				logf("%s", line)
			}
			prev = cur
		}
	}
}

// statsLine: o que mudou entre duas leituras dos contadores.
func statsLine(prev, cur CacheStats) (string, bool) {
	hits, loads := cur.Hits-prev.Hits, cur.Loads-prev.Loads
	shared, invalidations := cur.Shared-prev.Shared, cur.Invalidations-prev.Invalidations
	if hits+loads+shared+invalidations == 0 {
		return "", false
	}
	ratio := 0.0
	if total := hits + loads + shared; total > 0 {
		ratio = 100 * float64(hits) / float64(total)
	}
	return fmt.Sprintf("[permission] cache: %d acertos, %d idas ao banco, %d caronas, %d invalidações, %d servidores (%s de acerto)",
		hits, loads, shared, invalidations, cur.Servers, percent(ratio)), true
}

// percent no formato brasileiro (99,0%).
func percent(v float64) string {
	s := fmt.Sprintf("%.1f%%", v)
	for i := range s {
		if s[i] == '.' {
			return s[:i] + "," + s[i+1:]
		}
	}
	return s
}
