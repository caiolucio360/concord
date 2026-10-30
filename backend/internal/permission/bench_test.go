package permission

import (
	"context"
	"fmt"
	"testing"
)

// benchSnapshot: um servidor grande o bastante para pesar (300 membros, 15
// cargos, 30 canais com sobrescritas de cargo e de membro).
func benchSnapshot() *Snapshot {
	snap := NewSnapshot("s1", "owner", DefaultEveryone)
	for r := 1; r <= 15; r++ {
		snap.WithRole(fmt.Sprintf("r%d", r), r, int64(1)<<uint(r%20))
	}
	for c := 0; c < 30; c++ {
		snap.WithChannel(fmt.Sprintf("c%d", c), "text",
			Overwrite{TargetType: TargetRole, TargetID: "everyone", Deny: ViewChannel},
			Overwrite{TargetType: TargetRole, TargetID: fmt.Sprintf("r%d", c%15+1), Allow: ViewChannel},
			Overwrite{TargetType: TargetRole, TargetID: fmt.Sprintf("r%d", (c+3)%15+1), Deny: SendMessages},
			Overwrite{TargetType: TargetMember, TargetID: fmt.Sprintf("u%d", c), Allow: ViewChannel},
		)
	}
	snap.WithMember("owner")
	for u := 0; u < 300; u++ {
		snap.WithMember(fmt.Sprintf("u%d", u), fmt.Sprintf("r%d", u%15+1), fmt.Sprintf("r%d", (u+5)%15+1), fmt.Sprintf("r%d", (u+9)%15+1))
	}
	return snap
}

// O que o broadcast de uma mensagem faz: CanView para cada conexão da sala.
func BenchmarkBroadcastFilter300(b *testing.B) {
	snap := benchSnapshot()
	users := make([]string, 300)
	for i := range users {
		users[i] = fmt.Sprintf("u%d", i)
	}
	b.ReportAllocs()
	for b.Loop() {
		for _, u := range users {
			_ = snap.CanView("c7", u)
		}
	}
}

// Uma checagem de envio de mensagem com o snapshot já no cache.
func BenchmarkRequireChannelHit(b *testing.B) {
	svc := NewService(&StaticStore{Snapshots: map[string]*Snapshot{"s1": benchSnapshot()}})
	ctx := context.Background()
	_ = svc.RequireChannel(ctx, "c7", "u7", ViewChannel)
	b.ReportAllocs()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			_ = svc.RequireChannel(ctx, "c7", "u7", ViewChannel)
		}
	})
}

// Só o acesso ao cache (sem o cálculo), muitas goroutines ao mesmo tempo.
func BenchmarkSnapshotHitParallel(b *testing.B) {
	svc := NewService(&StaticStore{Snapshots: map[string]*Snapshot{"s1": benchSnapshot()}})
	ctx := context.Background()
	_, _ = svc.Snapshot(ctx, "s1")
	b.ReportAllocs()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			_, _ = svc.Snapshot(ctx, "s1")
		}
	})
}
