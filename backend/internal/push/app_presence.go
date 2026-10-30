package push

// AppPresence responde ao notificador com o que vale para o celular: o app do celular está aberto (aí o aviso
// aparece dentro do app) e o status da pessoa (Não perturbar). O desktop aberto na mesma conta não conta.
type AppPresence struct {
	Mobile interface{ IsOpen(userID string) bool }
	Status interface{ EffectiveStatus(userID string) string }
}

func (p AppPresence) IsAppOpen(userID string) bool         { return p.Mobile.IsOpen(userID) }
func (p AppPresence) EffectiveStatus(userID string) string { return p.Status.EffectiveStatus(userID) }
