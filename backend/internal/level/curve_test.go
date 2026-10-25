package level

import "testing"

func TestFromXPStartsAtLevelOne(t *testing.T) {
	level, into, next := FromXP(0)
	if level != 1 || into != 0 || next != 310 {
		t.Fatalf("FromXP(0) = %d,%d,%d, want 1,0,310", level, into, next)
	}
}

func TestFromXPCrossesLevelsExactly(t *testing.T) {
	if level, into, _ := FromXP(309); level != 1 || into != 309 {
		t.Fatalf("FromXP(309) = level %d into %d, want 1/309", level, into)
	}
	if level, into, next := FromXP(310); level != 2 || into != 0 || next != 440 {
		t.Fatalf("FromXP(310) = %d,%d,%d, want 2,0,440", level, into, next)
	}
	// 310 + 440 + 590 = 1340 → nível 4.
	if level, _, _ := FromXP(1340); level != 4 {
		t.Fatalf("FromXP(1340) = %d, want 4", level)
	}
}

func TestXPForMinutesHasDailyFatigue(t *testing.T) {
	// Primeiras 2 h: 5 XP por minuto.
	if got := XPForMinutes(0, 120); got != 600 {
		t.Fatalf("first 2h = %d, want 600", got)
	}
	// De 2 h a 4 h: metade (2,5 por minuto).
	if got := XPForMinutes(120, 120); got != 300 {
		t.Fatalf("2h-4h = %d, want 300", got)
	}
	if got := XPForMinutes(120, 2); got != 5 {
		t.Fatalf("two tired minutes = %d, want 5", got)
	}
	// Depois de 4 h: nada.
	if got := XPForMinutes(240, 60); got != 0 {
		t.Fatalf("after 4h = %d, want 0", got)
	}
	// Um bloco que atravessa as faixas.
	if got := XPForMinutes(119, 2); got != 5+3 {
		t.Fatalf("crossing into tired = %d, want 8", got)
	}
	if got := XPForMinutes(0, 24*60); got != MaxXPPerDay || MaxXPPerDay != 900 {
		t.Fatalf("whole day = %d (max %d), want 900", got, MaxXPPerDay)
	}
}

func TestCurveIsHardAndUnbounded(t *testing.T) {
	// Nível 10 exige pelo menos 11 dias, por causa do cansaço diário.
	var total int64
	for l := 1; l < 10; l++ {
		total += XPToNext(l)
	}
	if days := (total + MaxXPPerDay - 1) / MaxXPPerDay; days < 11 {
		t.Fatalf("level 10 in %d days, want at least 11", days)
	}

	if level, _, _ := FromXP(1 << 40); level < 1000 {
		t.Fatalf("huge XP gave level %d, want no cap", level)
	}
}
