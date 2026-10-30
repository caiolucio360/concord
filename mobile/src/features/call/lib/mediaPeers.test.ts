import type { CallUser } from './callTypes'
import { mergeMediaPeers } from './mediaPeers'

const ana: CallUser = { id: 'u1', username: 'ana', display_name: 'Ana', avatar_url: null }
const MAESTRO = 'bot-music:ch1'

describe('mergeMediaPeers (a sala de mídia é quem sabe quem está na call)', () => {
  it('o Maestro só existe na mídia: entra na lista como bot, com o nome do LiveKit', () => {
    const merged = mergeMediaPeers([ana], { u1: 'Ana', [MAESTRO]: 'Maestro' }, 'me')
    expect(merged.map((p) => p.id)).toEqual(['u1', MAESTRO])
    expect(merged[1]).toMatchObject({ display_name: 'Maestro', is_bot: true })
  })

  it('quem está na sala e o backend perdeu aparece; eu mesmo nunca entro por aqui', () => {
    const merged = mergeMediaPeers([], { u2: 'Bia', me: 'Eu' }, 'me')
    expect(merged).toEqual([{ id: 'u2', username: '', display_name: 'Bia', avatar_url: null }])
  })

  it('quem o backend já conhece mantém os dados dele (foto, nome)', () => {
    expect(mergeMediaPeers([ana], { u1: 'outro nome' }, 'me')).toEqual([ana])
  })

  it('o Maestro some da lista quando sai da sala; pessoas só saem pelos eventos do servidor', () => {
    const withBot = mergeMediaPeers([ana], { u1: 'Ana', [MAESTRO]: 'Maestro' }, 'me')
    expect(mergeMediaPeers(withBot, { u1: 'Ana' }, 'me').map((p) => p.id)).toEqual(['u1'])
    expect(mergeMediaPeers(withBot, {}, 'me').map((p) => p.id)).toEqual(['u1'])
  })

  it('sem nome no LiveKit usa "Usuário" (e "Maestro" para o bot)', () => {
    expect(mergeMediaPeers([], { u3: '' }, 'me')[0].display_name).toBe('Usuário')
    expect(mergeMediaPeers([], { [MAESTRO]: '' }, 'me')[0].display_name).toBe('Maestro')
  })

  it('nada muda: devolve a mesma lista (evita re-render)', () => {
    const people = [ana]
    expect(mergeMediaPeers(people, { u1: 'Ana' }, 'me')).toBe(people)
  })
})
