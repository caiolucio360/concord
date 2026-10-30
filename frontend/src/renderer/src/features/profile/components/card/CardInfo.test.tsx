import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { PublicUser } from '../../../auth/store/authStore'
import type { Channel } from '../../../servers/api/channels'
import type { Role } from '../../../servers/lib/permissions'
import { levelTier } from '../../../levels/lib/levels'
import type { CardInfo as Info } from '../../lib/profileCardView'
import CardInfo from './CardInfo'

const empty: Info = {
  tier: null,
  salinhaSince: null,
  serverSince: null,
  mutualFriends: [],
  mutualServers: [],
  mutualLoading: false,
  hasInfo: true
}
const look = { background: [], ink: 'light' as const }
const role = {
  id: 'r1',
  name: 'Mod',
  position: 1,
  color: 0xff0000,
  is_default: false
} as unknown as Role
const friend = (id: string, display_name = ''): PublicUser =>
  ({ id, username: `user_${id}`, display_name }) as PublicUser

const render = (info: Partial<Info>, over: Partial<Parameters<typeof CardInfo>[0]> = {}): string =>
  renderToStaticMarkup(
    <CardInfo
      info={{ ...empty, ...info }}
      live={false}
      look={look}
      inServer={false}
      isServerOwner={false}
      memberRoles={[]}
      {...over}
    />
  )

describe('CardInfo', () => {
  it('sem nada para mostrar não desenha a caixa', () => {
    expect(render({ hasInfo: false })).toBe('')
  })

  it('caixa vazia (só no servidor, sem cargo): nenhuma seção', () => {
    const html = render({}, { inServer: true })
    expect(html).not.toContain('Cargo')
    expect(html).not.toContain('Membro desde')
  })

  it('cargos do membro e o dono', () => {
    expect(render({}, { inServer: true, memberRoles: [role] })).toContain('Cargo<')
    expect(render({}, { inServer: true, memberRoles: [role, { ...role, id: 'r2' }] })).toContain(
      'Cargos'
    )
    expect(render({}, { inServer: true, isServerOwner: true })).toContain('Dono do servidor')
  })

  it('nível de voz com a faixa', () => {
    const html = render({ tier: levelTier(12), level: 12 })
    expect(html).toContain('Nível de voz')
    expect(html).toContain('Nível 12')
  })

  it('membro desde: na Salinha e neste servidor', () => {
    expect(render({ salinhaSince: '1 de mai. de 2025' })).toContain('· na Salinha')
    const both = render({ salinhaSince: 'a', serverSince: 'b' })
    expect(both).toContain('· neste servidor')
    expect(render({ serverSince: 'b' })).not.toContain('· na Salinha')
  })

  it('servidores em comum: singular e plural', () => {
    expect(render({ mutualServers: [{ id: 's1', name: 'Alfa' }] })).toContain('1 servidor em comum')
    const html = render({
      mutualServers: [
        { id: 's1', name: 'Alfa' },
        { id: 's2', name: 'Beta' }
      ]
    })
    expect(html).toContain('2 servidores em comum')
    expect(html).toContain('Alfa, Beta')
  })

  it('amigos em comum: singular, plural e o nome de quem não tem nome de exibição', () => {
    expect(render({ mutualFriends: [friend('a', 'Ana')] })).toContain('1 amigo em comum')
    const html = render({ mutualFriends: [friend('a', 'Ana'), friend('b')] })
    expect(html).toContain('2 amigos em comum')
    expect(html).toContain('title="user_b"')
  })

  it('em call, com o selo LIVE quando transmite', () => {
    const voiceChannel = { id: 'c1', name: 'Geral' } as Channel
    expect(render({ voiceChannel })).toContain('Geral')
    expect(render({ voiceChannel }, { live: true })).toContain('LIVE')
  })

  it('em comum ainda carregando: esqueleto', () => {
    expect(render({ mutualLoading: true }).length).toBeGreaterThan(render({}).length)
  })
})
