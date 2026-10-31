package main

import (
	"gin-quickstart/backend/internal/badge"
	"gin-quickstart/backend/internal/eventobjective"
)

// wireEventObjectives: o tempo dos objetivos dos eventos, contado olhando as
// calls (sem AFK) das salas dos eventos, só de contas reais (docs/adr/0037).
// Usa o level (aviso de nível) e o callAFK, criados antes. O ticker para junto
// com o contexto do app.
func (a *app) wireEventObjectives() {
	service := eventobjective.NewService(
		eventobjective.NewRepository(a.db),
		a.callAFK,
		badge.NewRealAccountCache(badge.BadgeRepository(a.db)),
		a.hub,
		a.hub,
		a.levelService,
	)
	go service.Run(a.ctx)
}
