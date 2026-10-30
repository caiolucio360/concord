import type { Role, ServerMember } from '../api/members'
import { groupMembers, memberColorCss } from './memberGroups'

const role = (id: string, over: Partial<Role> = {}): Role => ({ id, name: id, color: null, position: 1, hoist: false, is_default: false, ...over })
const member = (user_id: string, role_ids: string[] = []): ServerMember => ({ user_id, role_ids, username: user_id, display_name: user_id })

describe('groupMembers (mesma regra da web, como o Discord)', () => {
  const roles = [role('mods', { name: 'Moderação', hoist: true, position: 5 }), role('vip', { name: 'VIP', hoist: true, position: 3 }), role('cor', { color: 0xff0000, position: 9 }), role('everyone', { is_default: true, position: 0 })]

  it('online por cargo exibido à parte (do mais alto), o resto em "Membros" e os offline no fim', () => {
    const members = [member('a', ['vip', 'mods']), member('b', ['vip']), member('c'), member('d', ['mods'])]
    const groups = groupMembers({ members, roles, isOnline: (id) => id !== 'd' })
    expect(groups.map((g) => [g.title, g.members.map((m) => m.user_id)])).toEqual([
      ['Moderação', ['a']],
      ['VIP', ['b']],
      ['Membros', ['c']],
      ['Offline', ['d']]
    ])
  })

  it('cargo de sistema (Bots) vem depois dos cargos comuns; grupos vazios não aparecem', () => {
    const withBots = [...roles, role('bots', { name: 'Bots', hoist: true, is_system: true, position: 99 })]
    const groups = groupMembers({ members: [member('m', ['bots']), member('x', ['mods'])], roles: withBots, isOnline: () => true })
    expect(groups.map((g) => g.title)).toEqual(['Moderação', 'Bots'])
  })

  it('cor do nome: a do cargo mais alto que tem cor', () => {
    expect(memberColorCss(roles, ['vip', 'cor'])).toBe('#ff0000')
    expect(memberColorCss(roles, ['vip'])).toBeUndefined()
  })
})
