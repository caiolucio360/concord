import type { ObjectiveDifficulty, ObjectiveInput, ObjectiveKind } from '../api/events'

// Objetivos do evento (spec 2026-10-31): metas, rótulos, título gerado e barra.
// O XP de cada objetivo vem do servidor (`xp`); aqui só se formata.

export const MAX_OBJECTIVES = 3
export const OBJECTIVE_MINUTES = [15, 30, 45, 60, 90, 120]

export const KINDS: { value: ObjectiveKind; label: string }[] = [
  { value: 'time', label: 'Ficar na sala' },
  { value: 'game', label: 'Jogar o jogo do evento' }
]

export const DIFFICULTIES: { value: ObjectiveDifficulty; label: string }[] = [
  { value: 'easy', label: 'Fácil' },
  { value: 'medium', label: 'Médio' },
  { value: 'hard', label: 'Difícil' }
]

/** As metas que cabem na duração do evento. */
export function minutesOptions(durationMinutes: number): number[] {
  return OBJECTIVE_MINUTES.filter((m) => m <= durationMinutes)
}

/** O objetivo que "Adicionar objetivo" cria: de tempo, fácil e de 15 min. */
export function emptyObjective(): ObjectiveInput {
  return { kind: 'time', difficulty: 'easy', minutes: 15 }
}

/** O título do objetivo, gerado do tipo, da meta e do jogo do evento. */
export function objectiveTitle(o: { kind: ObjectiveKind; minutes: number }, game: string | null): string {
  if (o.kind === 'time') return `Ficar ${o.minutes} min na sala do evento`
  return `Jogar ${game ?? 'o jogo do evento'} por ${o.minutes} min`
}

/** Quanto da barra está cheio (0 a 100). */
export function progressPercent(myMinutes: number, minutes: number): number {
  if (minutes <= 0) return 0
  return Math.min(100, Math.round((myMinutes / minutes) * 100))
}

/** 1000 → "1.000" (feito à mão: não depende dos dados de locale do ambiente). */
export function formatXp(xp: number): string {
  return String(xp).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** O aviso ao cumprir; com o teto diário, diz que parte do XP ficou de fora. */
export function objectiveToast(title: string, xp: number, capped: boolean): string {
  const base = `Objetivo cumprido: ${title}. +${formatXp(xp)} XP`
  return capped ? `${base} (limite diário de XP de eventos)` : base
}
