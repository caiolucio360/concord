package eventobjective

import (
	"testing"
	"time"
)

func tg(obj string) Target {
	return Target{
		ObjectiveID: obj, EventID: "ev",
		Occurrence: time.Date(2026, 12, 1, 20, 0, 0, 0, time.UTC), Minutes: 30,
	}
}

func TestTrackerDrainsWholeMinutesOnly(t *testing.T) {
	start := time.Date(2026, 12, 1, 20, 0, 0, 0, time.UTC)
	tr := newTracker(start)
	c := []Contribution{{UserID: "ana", Target: tg("o1")}}
	for i := 1; i <= 5; i++ { // 5 ticks de 10 s = 50 s
		tr.accrue(c, start.Add(time.Duration(i)*10*time.Second))
	}
	if got := tr.drain(); len(got) != 0 {
		t.Fatalf("50 s não fecham um minuto: %+v", got)
	}
	tr.accrue(c, start.Add(60*time.Second))
	got := tr.drain()
	if len(got) != 1 || got[0].Minutes != 1 || got[0].UserID != "ana" || got[0].Target.ObjectiveID != "o1" {
		t.Fatalf("drain = %+v", got)
	}
}

func TestTrackerLosesTheRestOfWhoLeft(t *testing.T) {
	start := time.Date(2026, 12, 1, 20, 0, 0, 0, time.UTC)
	tr := newTracker(start)
	c := []Contribution{{UserID: "ana", Target: tg("o1")}}
	for i := 1; i <= 3; i++ {
		tr.accrue(c, start.Add(time.Duration(i)*10*time.Second))
	}
	tr.drain() // 30 s guardados
	tr.accrue(nil, start.Add(40*time.Second))
	tr.drain()                // saiu: o resto some
	for i := 5; i <= 9; i++ { // voltou: 50 s (5 ticks) não fecham um minuto
		tr.accrue(c, start.Add(time.Duration(i)*10*time.Second))
		if got := tr.drain(); len(got) != 0 {
			t.Fatalf("quem saiu recomeça do zero (tick %d): %+v", i, got)
		}
	}
}

func TestTrackerKeepsEachObjectiveAndPersonApart(t *testing.T) {
	start := time.Date(2026, 12, 1, 20, 0, 0, 0, time.UTC)
	tr := newTracker(start)
	cs := []Contribution{
		{UserID: "ana", Target: tg("o1")},
		{UserID: "ana", Target: tg("o2")},
		{UserID: "bia", Target: tg("o1")},
	}
	for i := 1; i <= 6; i++ {
		tr.accrue(cs, start.Add(time.Duration(i)*10*time.Second))
	}
	got := tr.drain()
	if len(got) != 3 {
		t.Fatalf("drain = %+v, esperava 3 linhas", got)
	}
	for _, d := range got {
		if d.Minutes != 1 {
			t.Errorf("%s/%s = %d min", d.UserID, d.Target.ObjectiveID, d.Minutes)
		}
	}
}

func TestTrackerRestoreGivesBackWhatCouldNotBeSaved(t *testing.T) {
	start := time.Date(2026, 12, 1, 20, 0, 0, 0, time.UTC)
	tr := newTracker(start)
	tr.restore(Drained{UserID: "ana", Target: tg("o1"), Minutes: 2})
	tr.accrue([]Contribution{{UserID: "ana", Target: tg("o1")}}, start.Add(10*time.Second))
	got := tr.drain()
	if len(got) != 1 || got[0].Minutes != 2 {
		t.Fatalf("restore deveria devolver 2 min: %+v", got)
	}
}

func TestTrackerIgnoresAFrozenServerGap(t *testing.T) {
	start := time.Date(2026, 12, 1, 20, 0, 0, 0, time.UTC)
	tr := newTracker(start)
	tr.accrue([]Contribution{{UserID: "ana", Target: tg("o1")}}, start.Add(5*time.Minute))
	if got := tr.drain(); len(got) != 0 {
		t.Fatalf("servidor parado não dá minutos de uma vez: %+v", got)
	}
}
