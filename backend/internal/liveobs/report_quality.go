package liveobs

// Motivos e pontuação dos sinais da ADR 0032: em que ponto do caminho
// (captura → codificador → rede → decodificador) os quadros da live se
// perdem, e o que aconteceu com a voz (áudio sintetizado, perda, quedas).
// Os textos aparecem no painel dos devs. Puro.

const (
	// Captura ou fps abaixo disso do alvo conta como "abaixo".
	belowTarget = 0.8
	// Áudio sintetizado (%) a partir do qual a voz soa robotizada/cortada.
	robotPct = 3.0
	// Perda (%) no áudio recebido que já explica a síntese.
	audioLossPct = 2.0
	// Abaixo disso de perda, a síntese não veio da rede.
	noLossPct = 0.5
)

func below(v, target *float64) bool {
	return v != nil && target != nil && *target > 0 && *v < belowTarget**target
}

// slowCodec: o codificador gasta quase todo o tempo de um quadro no alvo.
func slowCodec(s SessionStats) bool {
	return s.CodecMs != nil && s.TargetFPS != nil && *s.TargetFPS > 0 &&
		*s.CodecMs >= belowTarget*1000 / *s.TargetFPS
}

// notDecoded: chegam bem mais quadros do que saem do decodificador.
func notDecoded(s SessionStats) bool {
	if s.RecvFPS == nil || s.FPS == nil {
		return false
	}
	return *s.RecvFPS-*s.FPS >= max(5, 0.2**s.RecvFPS)
}

func robotic(s SessionStats) bool { return ratioAtLeast(s.ConcealedPct, robotPct) }

func kindIs(kind string, hit func(SessionStats) bool) func(SessionStats) bool {
	return func(s SessionStats) bool { return s.Kind == kind && hit(s) }
}

var qualityRules = []reasonRule{
	{"Captura abaixo do alvo (não é o codificador)", kindIs(KindShare, func(s SessionStats) bool { return below(s.CaptureFPS, s.TargetFPS) })},
	{"Codificador não dá conta do fps", kindIs(KindShare, slowCodec)},
	{"Quadros chegam e não decodificam", kindIs(KindWatch, notDecoded)},
	{"Voz robotizada (áudio sintetizado)", kindIs(KindCall, robotic)},
	{"Perda no áudio recebido", kindIs(KindCall, func(s SessionStats) bool { return ratioAtLeast(s.RecvLossPct, audioLossPct) })},
	{"Áudio sintetizado sem perda (PC de quem ouve)", kindIs(KindCall, func(s SessionStats) bool {
		return robotic(s) && s.RecvLossPct != nil && *s.RecvLossPct < noLossPct
	})},
	{"Voz reconectou", func(s SessionStats) bool { return s.Reconnects > 0 }},
	{"Voz não conectou", func(s SessionStats) bool { return s.Failures > 0 }},
}

// callScore: quanto pior a voz, maior (não conectar pesa mais que tudo).
func callScore(s SessionStats) float64 {
	return orZero(s.ConcealedPct)*10 + orZero(s.RecvLossPct)*5 + orZero(s.LossPct)*5 +
		float64(s.Reconnects)*20 + float64(s.Failures)*100
}
