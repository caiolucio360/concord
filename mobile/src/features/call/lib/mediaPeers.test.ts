import type { CallUser } from './callTypes'
import { mergeMediaPeers } from './mediaPeers'

const ana: CallUser = { id: 'u1', username: 'ana', display_name: 'Ana', avatar_url: null }
const MAESTRO = 'bot-music:ch1'

describe('mergeMediaPeers (o Maestro só existe na sala de mídia)', () => {
  it('o Maestro só existe na mídia: entra na lista como bot, com o nome do LiveKit', () => {
    const merged = mergeMediaPeers([ana], { u1: 'Ana', [MAESTRO]: 'Maestro' }, 'me')
    expect(merged.map((p) => p.id)).toEqual(['u1', MAESTRO])
    expect(merged[1]).toMatchObject({ display_name: 'Maestro', is_bot: true })
  })

  it('pessoas que só existem na mídia não entram: quem sai fica fora (o servidor decide por eventos), sem fantasmas', () => {
    expect(mergeMediaPeers([], { u2: 'Bia', me: 'Eu' }, 'me')).toEqual([])
  })

  it('quem o backend já conhece mantém os dados dele (foto, nome)', () => {
    expect(mergeMediaPeers([ana], { u1: 'outro nome' }, 'me')).toEqual([ana])
  })

  it('o Maestro some da lista quando sai da sala; pessoas só saem pelos eventos do servidor', () => {
    const withBot = mergeMediaPeers([ana], { u1: 'Ana', [MAESTRO]: 'Maestro' }, 'me')
    expect(mergeMediaPeers(withBot, { u1: 'Ana' }, 'me').map((p) => p.id)).toEqual(['u1'])
    expect(mergeMediaPeers(withBot, {}, 'me').map((p) => p.id)).toEqual(['u1'])
  })

  it('o bot sem nome no LiveKit chama "Maestro"', () => {
    expect(mergeMediaPeers([], { [MAESTRO]: '' }, 'me')[0].display_name).toBe('Maestro')
  })

  it('nada muda: devolve a mesma lista (evita re-render)', () => {
    const people = [ana]
    expect(mergeMediaPeers(people, { u1: 'Ana' }, 'me')).toBe(people)
  })
})
