package level

// Curva de níveis: passar do nível L para o L+1 custa 10·L² + 100·L + 200 XP,
// e cada minuto completo em call (desmutado e com mais alguém) rende XP com
// "cansaço" diário. Não há nível máximo.
//
// Com 5 XP/min isso dá, em tempo de call:
//
//	nível 2  ≈ 1 h      nível 5  ≈ 7 h      nível 10 ≈ 30 h
//	nível 20 ≈ 158 h    nível 50 ≈ 1.800 h
//
// e, por causa do cansaço (no máximo 900 XP por dia), pelo menos 11 dias
// até o nível 10 e uns 600 dias até o 50.
const XPPerMinute = 5

// Cansaço diário (o dia vira à meia-noite de Brasília): até FullRateMinutes
// de call no dia o XP é cheio; até TiredMinutes é a metade; depois disso o dia
// não rende mais XP.
const (
	FullRateMinutes = 120
	TiredMinutes    = 240
)

// MaxXPPerDay é o máximo que dá para ganhar num dia.
const MaxXPPerDay = FullRateMinutes*XPPerMinute + (TiredMinutes-FullRateMinutes)*XPPerMinute/2

// XPToNext é quanto XP o nível `level` precisa para subir.
func XPToNext(level int) int64 {
	l := int64(level)
	return 10*l*l + 100*l + 200
}

// XPForMinutes: XP de `minutes` minutos novos de call para quem já tinha
// `before` minutos hoje. Na faixa cansada cada minuto vale metade (2,5 XP),
// alternando 3 e 2 para a conta fechar inteira.
func XPForMinutes(before int64, minutes int64) int64 {
	var xp int64
	for i := before; i < before+minutes; i++ {
		switch {
		case i < FullRateMinutes:
			xp += XPPerMinute
		case i < TiredMinutes:
			if (i-FullRateMinutes)%2 == 0 {
				xp += (XPPerMinute + 1) / 2
			} else {
				xp += XPPerMinute / 2
			}
		}
	}
	return xp
}

// FromXP converte o XP total em nível, XP dentro do nível e XP para o próximo.
func FromXP(xp int64) (level int, intoLevel int64, forNext int64) {
	level = 1
	remaining := xp
	for remaining >= XPToNext(level) {
		remaining -= XPToNext(level)
		level++
	}
	return level, remaining, XPToNext(level)
}
