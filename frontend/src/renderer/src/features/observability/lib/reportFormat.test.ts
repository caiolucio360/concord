import { describe, expect, it } from 'vitest'
import {
  chartPath,
  durationLabel,
  eventLabel,
  kindLabel,
  nearestIndex,
  niceMax,
  numberLabel,
  pctLabel
} from './reportFormat'

describe('rótulos', () => {
  it('duração', () => {
    expect(durationLabel(45)).toBe('45 s')
    expect(durationLabel(600)).toBe('10 min')
    expect(durationLabel(3900)).toBe('1 h 05 min')
  })
  it('porcentagem de fração e número', () => {
    expect(pctLabel(0.123)).toBe('12%')
    expect(pctLabel(null)).toBe('—')
    expect(numberLabel(1.26)).toBe('1,3')
    expect(numberLabel(null)).toBe('—')
    expect(numberLabel(12.5, 0)).toBe('13')
  })
  it('tipo de sessão e evento', () => {
    expect(kindLabel('transmite')).toBe('Transmitindo')
    expect(kindLabel('assiste')).toBe('Assistindo')
    expect(kindLabel('call')).toBe('Call')
    expect(kindLabel('x')).toBe('x')
    expect(eventLabel('degrau_caiu')).toBe('Qualidade caiu')
    expect(eventLabel('novo')).toBe('novo')
  })
})

describe('gráfico', () => {
  it('teto redondo acima do maior valor', () => {
    expect(niceMax([0, 3.2, 7.9])).toBe(10)
    expect(niceMax([0, 0])).toBe(1)
    expect(niceMax([null, 42])).toBe(50)
    expect(niceMax([130])).toBe(150)
  })
  it('linha com lacunas onde não há valor', () => {
    expect(chartPath([0, 5, 10], 100, 50, 10)).toBe('M0,50L50,25L100,0')
    expect(chartPath([1, null, 1], 100, 50, 2)).toBe('M0,25M100,25')
    expect(chartPath([5], 100, 50, 10)).toBe('M0,25')
    expect(chartPath([], 100, 50, 10)).toBe('')
  })
  it('ponto mais perto do ponteiro', () => {
    expect(nearestIndex(0, 100, 5)).toBe(0)
    expect(nearestIndex(60, 100, 5)).toBe(2)
    expect(nearestIndex(100, 100, 5)).toBe(4)
    expect(nearestIndex(-5, 100, 5)).toBe(0)
    expect(nearestIndex(10, 100, 0)).toBe(-1)
  })
})
