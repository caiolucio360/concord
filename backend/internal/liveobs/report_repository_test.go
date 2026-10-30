package liveobs

import (
	"context"
	"testing"
	"time"
)

func TestReportRepositoryAgregaSessoes(t *testing.T) {
	db := newTelemetryDB(t)
	ctx := context.Background()
	for _, q := range []string{
		`CREATE TABLE dev_badge_users (user_id UUID PRIMARY KEY)`,
		`UPDATE users SET username = 'ana' WHERE id = '` + userAna + `'`,
		`INSERT INTO dev_badge_users VALUES ('` + userAna + `')`,
	} {
		if _, err := db.Exec(ctx, q); err != nil {
			t.Fatal(err)
		}
	}
	tel := NewTelemetryRepository(db)
	hw, sw := true, false
	samples := []Sample{
		{Seconds: 20, Codec: "H265", Hardware: &hw, FPS: fp(60), TargetFPS: intp(60), Limitation: "none", Transport: "udp"},
		{Seconds: 20, Codec: "H265", Hardware: &hw, FPS: fp(30), TargetFPS: intp(60), Limitation: "cpu", Step: intp(1), StepChanges: 1, Transport: "udp"},
		{Seconds: 20, Codec: "H264", Hardware: &sw, FPS: fp(60), TargetFPS: intp(60), Limitation: "cpu", Freezes: 2, Transport: "tcp"},
	}
	for i, s := range samples {
		r := Report{SessionID: sessionA, Kind: KindShare, CallID: callA, Context: ClientContext{OS: "Windows", GPU: "RTX"},
			Sample: &s, Ended: i == len(samples)-1}
		if i == 1 {
			r.Events = []Event{{Type: EventStepDown, Detail: "0 → 1"}}
		}
		if err := tel.Save(ctx, userAna, r); err != nil {
			t.Fatal(err)
		}
	}
	repo := NewReportRepository(db)
	from := time.Now().Add(-time.Hour)
	got, err := repo.Sessions(ctx, from)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 {
		t.Fatalf("sessões = %d, quer 1", len(got))
	}
	s := got[0]
	checks := []struct {
		name string
		ok   bool
	}{
		{"quem", s.Username == "ana" && s.UserID == userAna && s.Kind == KindShare && s.CallID == callA},
		{"contexto", s.OS == "Windows" && s.GPU == "RTX"},
		{"tempo medido", s.Seconds == 60},
		{"codec mais visto", s.Codec == "H265"},
		{"transporte mais visto", s.Transport == "udp"},
		{"na placa 2/3", s.HardwareRatio != nil && near(*s.HardwareRatio, 2.0/3)},
		{"abaixo do alvo 1/3 (fps 30 de 60 com degrau)", s.BelowRatio != nil && near(*s.BelowRatio, 1.0/3)},
		{"limitado por CPU 2/3", near(s.CPURatio, 2.0/3)},
		{"congelamentos e trocas", s.Freezes == 2 && s.StepChanges == 1},
		{"fps médio", s.FPS != nil && near(*s.FPS, 50)},
		{"terminou", !s.EndedAt.IsZero()},
	}
	for _, c := range checks {
		if !c.ok {
			t.Errorf("%s: %+v", c.name, s)
		}
	}

	events, err := repo.Events(ctx, from, 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 3 || events[0].Type != EventEnd || events[0].Username != "ana" || events[1].Detail != "0 → 1" {
		t.Errorf("eventos = %+v", events)
	}

	for user, want := range map[string]bool{userAna: true, userBia: false} {
		dev, err := repo.IsDev(ctx, user)
		if err != nil || dev != want {
			t.Errorf("IsDev(%s) = %v, %v; quer %v", user, dev, err, want)
		}
	}
}
