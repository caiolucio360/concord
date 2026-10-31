package eventobjective

import "testing"

func TestXPTable(t *testing.T) {
	cases := []struct {
		d        Difficulty
		personal int64
		server   int64
	}{
		{Easy, 1000, 50},
		{Medium, 3000, 150},
		{Hard, 6000, 300},
	}
	for _, c := range cases {
		if got := PersonalXP(c.d); got != c.personal {
			t.Errorf("%s pessoal = %d, esperava %d", c.d, got, c.personal)
		}
		if got := ServerXP(c.d); got != c.server {
			t.Errorf("%s servidor = %d, esperava %d", c.d, got, c.server)
		}
	}
	if PersonalXP("???") != 0 || ServerXP("???") != 0 {
		t.Error("dificuldade desconhecida não vale XP")
	}
}
