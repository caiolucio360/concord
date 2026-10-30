import { describe, expect, it } from 'vitest'
import type { PublicProfile } from '../api/users'
import { isStranger, mergeProfile } from './profileRelationship'

const profile = (over: Partial<PublicProfile> = {}): PublicProfile => ({
  id: 'u1',
  username: 'mugis',
  display_name: 'Mugis',
  pronouns: '',
  bio: '',
  status_text: '',
  links: [],
  status: 'online',
  created_at: '2026-10-24T00:00:00Z',
  ...over
})

describe('isStranger', () => {
  it('só sem vínculo esconde o @ e os atalhos', () => {
    expect(isStranger('none')).toBe(true)
    expect(isStranger('friend')).toBe(false)
    expect(isStranger('shared_server')).toBe(false)
    expect(isStranger('self')).toBe(false)
    expect(isStranger(undefined)).toBe(false)
  })

  it('antes do perfil chegar vale o vínculo de onde o cartão abriu (ranking)', () => {
    expect(isStranger(undefined, 'none')).toBe(true)
    expect(isStranger('friend', 'none')).toBe(false)
  })
})

describe('mergeProfile', () => {
  it('perfil da API troca o guardado', () => {
    const next = profile({ relationship: 'friend' })
    expect(mergeProfile(profile({ relationship: 'none', username: '' }), next)).toEqual(next)
  })

  it('evento sem vínculo de alguém sem vínculo não devolve o @', () => {
    const prev = profile({ relationship: 'none', username: '' })
    const merged = mergeProfile(prev, profile({ display_name: 'Mugis RX' }))
    expect(merged).toMatchObject({ display_name: 'Mugis RX', username: '', relationship: 'none' })
  })

  it('evento de quem tem vínculo mantém o vínculo e o @ novo', () => {
    const prev = profile({ relationship: 'shared_server' })
    const merged = mergeProfile(prev, profile({ username: 'mugis_rx' }))
    expect(merged).toMatchObject({ username: 'mugis_rx', relationship: 'shared_server' })
  })

  it('sem nada guardado fica o que chegou', () => {
    const next = profile()
    expect(mergeProfile(undefined, next)).toEqual(next)
  })
})
