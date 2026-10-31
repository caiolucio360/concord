package eventobjective

import "slices"

// Validate confere o conjunto de objetivos do evento final (já com a duração e
// o jogo que ele terá): até MaxObjectives, tipo e dificuldade conhecidos, meta
// da lista e que caiba na duração, e o tipo "jogo" só com jogo no evento.
func Validate(in []Input, durationMinutes int, hasGame bool) error {
	if len(in) > MaxObjectives {
		return ErrInvalidObjective
	}
	for _, o := range in {
		if !validObjective(o, durationMinutes, hasGame) {
			return ErrInvalidObjective
		}
	}
	return nil
}

func validObjective(o Input, durationMinutes int, hasGame bool) bool {
	if o.Kind != KindTime && o.Kind != KindGame {
		return false
	}
	if o.Kind == KindGame && !hasGame {
		return false
	}
	if PersonalXP(o.Difficulty) == 0 {
		return false
	}
	return slices.Contains(AllowedMinutes, o.Minutes) && o.Minutes <= durationMinutes
}
