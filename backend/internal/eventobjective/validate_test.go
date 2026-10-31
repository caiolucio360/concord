package eventobjective

import (
	"errors"
	"testing"
)

func ok(k Kind) Input { return Input{Kind: k, Difficulty: Easy, Minutes: 30} }

func TestValidateAccepts(t *testing.T) {
	cases := map[string]struct {
		in       []Input
		duration int
		hasGame  bool
	}{
		"sem objetivos":        {nil, 120, false},
		"lista vazia":          {[]Input{}, 120, false},
		"um de tempo":          {[]Input{ok(KindTime)}, 120, false},
		"jogo com jogo":        {[]Input{ok(KindGame)}, 120, true},
		"três objetivos":       {[]Input{ok(KindTime), ok(KindTime), ok(KindGame)}, 120, true},
		"meta igual à duração": {[]Input{{KindTime, Hard, 120}}, 120, false},
	}
	for name, c := range cases {
		if err := Validate(c.in, c.duration, c.hasGame); err != nil {
			t.Errorf("%s: %v", name, err)
		}
	}
}

func TestValidateRejects(t *testing.T) {
	cases := map[string]struct {
		in       []Input
		duration int
		hasGame  bool
	}{
		"quatro objetivos":      {[]Input{ok(KindTime), ok(KindTime), ok(KindTime), ok(KindTime)}, 240, false},
		"tipo desconhecido":     {[]Input{{"tempo", Easy, 30}}, 120, false},
		"dificuldade invalida":  {[]Input{{KindTime, "extreme", 30}}, 120, false},
		"meta fora da lista":    {[]Input{{KindTime, Easy, 20}}, 120, false},
		"meta zero":             {[]Input{{KindTime, Easy, 0}}, 120, false},
		"meta maior que evento": {[]Input{{KindTime, Easy, 60}}, 30, false},
		"jogo sem jogo":         {[]Input{ok(KindGame)}, 120, false},
	}
	for name, c := range cases {
		if err := Validate(c.in, c.duration, c.hasGame); !errors.Is(err, ErrInvalidObjective) {
			t.Errorf("%s: erro %v, esperava ErrInvalidObjective", name, err)
		}
	}
}
