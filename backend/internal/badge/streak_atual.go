package badge

import "time"

// Sequência atual: os dias seguidos até hoje (Brasília). A sequência segue
// viva se a pessoa usou o app hoje OU ontem: quem ainda não abriu o app hoje
// tem até o fim do dia para manter a conta. Antes de ontem, está quebrada
// (0). O RecordActiveDay (repository.go) é quem soma; aqui só se lê.

// SelfStreak é a sequência vista pela própria pessoa.
type SelfStreak struct {
	Current int64 `json:"current"`
	Longest int64 `json:"longest"`
	// Viva, mas o dia de hoje ainda não contou.
	AtRisk bool `json:"at_risk"`
}

// PublicStreak é a sequência vista por outra pessoa: só o número atual,
// como o resto do perfil, sem dizer se hoje já contou.
type PublicStreak struct {
	Current int64 `json:"current"`
}

// currentStreak calcula a sequência atual a partir do último dia gravado.
func currentStreak(s Stats, now time.Time) SelfStreak {
	out := SelfStreak{Longest: s.LongestStreakDays}
	y, m, d := now.In(Brasilia()).Date()
	switch s.ActiveLastDay {
	case dayString(y, m, d):
		out.Current = s.StreakDays
	case dayString(y, m, d-1):
		out.Current, out.AtRisk = s.StreakDays, s.StreakDays > 0
	}
	return out
}

func dayString(y int, m time.Month, d int) string {
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC).Format(time.DateOnly)
}

// streakFor devolve a sequência no formato de quem vê; nil se a pessoa ainda
// não conquistou o badge Sequência (ele fica escondido até o tier 1).
func streakFor(self bool, s Stats, badges []Badge, now time.Time) any {
	if !temBadge(badges, "sequencia") {
		return nil
	}
	cur := currentStreak(s, now)
	if self {
		return cur
	}
	return PublicStreak{Current: cur.Current}
}

// temBadge diz se a categoria já está na lista (tier 1 conquistado).
func temBadge(badges []Badge, key string) bool {
	for _, b := range badges {
		if b.Category == key {
			return true
		}
	}
	return false
}
