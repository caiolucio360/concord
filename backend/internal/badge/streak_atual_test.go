package badge

import (
	"context"
	"testing"
	"time"
)

// Brasília é UTC-3: 2026-10-26 02:30 UTC ainda é dia 25 lá.
func TestCurrentStreak(t *testing.T) {
	cases := []struct {
		name     string
		stats    Stats
		at       time.Time
		wantNow  int64
		wantRisk bool
	}{
		{"usou hoje", Stats{StreakDays: 5, LongestStreakDays: 9, ActiveLastDay: "2026-10-25"}, time.Date(2026, 10, 25, 15, 0, 0, 0, time.UTC), 5, false},
		{"usou ontem: segue viva e em risco", Stats{StreakDays: 5, LongestStreakDays: 9, ActiveLastDay: "2026-10-24"}, time.Date(2026, 10, 25, 15, 0, 0, 0, time.UTC), 5, true},
		{"anteontem: quebrada", Stats{StreakDays: 5, LongestStreakDays: 9, ActiveLastDay: "2026-10-23"}, time.Date(2026, 10, 25, 15, 0, 0, 0, time.UTC), 0, false},
		{"nunca usou", Stats{}, time.Date(2026, 10, 25, 15, 0, 0, 0, time.UTC), 0, false},
		{"fuso: 02:30 UTC ainda é o dia anterior em Brasília", Stats{StreakDays: 3, ActiveLastDay: "2026-10-25"}, time.Date(2026, 10, 26, 2, 30, 0, 0, time.UTC), 3, false},
		{"fuso: 03:30 UTC já é o dia seguinte em Brasília", Stats{StreakDays: 3, ActiveLastDay: "2026-10-25"}, time.Date(2026, 10, 26, 3, 30, 0, 0, time.UTC), 3, true},
		{"virada de mês", Stats{StreakDays: 4, ActiveLastDay: "2026-09-30"}, time.Date(2026, 10, 1, 15, 0, 0, 0, time.UTC), 4, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := currentStreak(c.stats, c.at)
			if got.Current != c.wantNow || got.AtRisk != c.wantRisk {
				t.Fatalf("currentStreak = %+v, quer atual %d e em risco %v", got, c.wantNow, c.wantRisk)
			}
			if got.Longest != c.stats.LongestStreakDays {
				t.Errorf("Longest = %d, quer %d", got.Longest, c.stats.LongestStreakDays)
			}
		})
	}
}

func TestBadgesStreakVisibleToSelfAndOthers(t *testing.T) {
	s, st, _, _, _ := newTestService()
	st.stats["ana"] = Stats{CreatedAt: FounderCutoff, StreakDays: 4, LongestStreakDays: 8, ActiveLastDay: "2026-10-24"}

	self, err := s.Badges(context.Background(), "ana", "ana")
	if err != nil {
		t.Fatal(err)
	}
	if got, ok := self.Streak.(SelfStreak); !ok || got.Current != 4 || got.Longest != 8 || !got.AtRisk {
		t.Fatalf("self streak = %+v", self.Streak)
	}

	other, err := s.Badges(context.Background(), "bia", "ana")
	if err != nil {
		t.Fatal(err)
	}
	if got, ok := other.Streak.(PublicStreak); !ok || got.Current != 4 {
		t.Fatalf("public streak = %+v", other.Streak)
	}
}

// Sem o tier 1 de Sequência o badge fica escondido: a sequência também.
func TestBadgesStreakHiddenWithoutBadge(t *testing.T) {
	s, st, _, _, _ := newTestService()
	st.stats["ana"] = Stats{CreatedAt: FounderCutoff, StreakDays: 2, LongestStreakDays: 2, ActiveLastDay: "2026-10-25"}

	for _, viewer := range []string{"ana", "bia"} {
		res, err := s.Badges(context.Background(), viewer, "ana")
		if err != nil {
			t.Fatal(err)
		}
		if res.Streak != nil {
			t.Errorf("viewer %s: streak = %+v, quer nil", viewer, res.Streak)
		}
	}
}

// O último dia gravado sai do banco como AAAA-MM-DD (TEST_DATABASE_URL).
func TestRepositoryStatsActiveLastDay(t *testing.T) {
	db := openTestDB(t)
	ctx := context.Background()
	id := newTestUser(t, db)
	repo := BadgeRepository(db)

	s, err := repo.Stats(ctx, id)
	if err != nil || s.ActiveLastDay != "" {
		t.Fatalf("sem dias: ActiveLastDay = %q, err %v", s.ActiveLastDay, err)
	}
	for _, day := range []string{"2026-10-24", "2026-10-25"} {
		if err := repo.RecordActiveDay(ctx, []string{id}, day); err != nil {
			t.Fatal(err)
		}
	}
	s, err = repo.Stats(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	if s.ActiveLastDay != "2026-10-25" || s.StreakDays != 2 || s.LongestStreakDays != 2 {
		t.Fatalf("stats = %q/%d/%d, quer 2026-10-25/2/2", s.ActiveLastDay, s.StreakDays, s.LongestStreakDays)
	}
}
