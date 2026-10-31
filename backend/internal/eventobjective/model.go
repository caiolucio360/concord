// Package eventobjective: objetivos dos eventos do servidor e o XP que pagam
// (docs/superpowers/specs/2026-10-31-eventos-objetivos-xp-design.md).
package eventobjective

import "errors"

type Kind string

const (
	// KindTime: ficar N minutos na sala do evento.
	KindTime Kind = "time"
	// KindGame: jogar o jogo do evento por N minutos.
	KindGame Kind = "game"
)

type Difficulty string

const (
	Easy   Difficulty = "easy"
	Medium Difficulty = "medium"
	Hard   Difficulty = "hard"
)

// MaxObjectives: no máximo 3 objetivos por evento.
const MaxObjectives = 3

// AllowedMinutes: as metas que o moderador pode escolher (minutos).
var AllowedMinutes = []int{15, 30, 45, 60, 90, 120}

// DailyPersonalCap: o máximo de XP pessoal que os eventos pagam a uma pessoa
// por dia (dia de Brasília), somando todos os eventos e servidores.
const DailyPersonalCap int64 = 6000

var ErrInvalidObjective = errors.New("objetivo inválido")

// PersonalXP é o XP pessoal que um objetivo da dificuldade paga.
func PersonalXP(d Difficulty) int64 {
	switch d {
	case Easy:
		return 1000
	case Medium:
		return 3000
	case Hard:
		return 6000
	}
	return 0
}

// ServerXP é a parte do servidor: 5% do XP pessoal.
func ServerXP(d Difficulty) int64 { return PersonalXP(d) / 20 }

// Input é o que o moderador manda para cada objetivo.
type Input struct {
	Kind       Kind       `json:"kind"`
	Difficulty Difficulty `json:"difficulty"`
	Minutes    int        `json:"minutes"`
}

// Objective é o objetivo como o app o recebe, com o meu progresso na ocorrência atual.
type Objective struct {
	ID         string     `json:"id"`
	Kind       Kind       `json:"kind"`
	Difficulty Difficulty `json:"difficulty"`
	Minutes    int        `json:"minutes"`
	// XP: o XP pessoal que paga (o do servidor é 5% disso).
	XP        int64 `json:"xp"`
	MyMinutes int   `json:"my_minutes"`
	MyDone    bool  `json:"my_done"`
}
