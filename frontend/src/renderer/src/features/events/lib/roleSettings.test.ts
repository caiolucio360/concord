import { describe, expect, it } from 'vitest'
import type { RoleSetting } from '../api/events'
import { ROLE_ACTIONS, withAction } from './roleSettings'

const roles: RoleSetting[] = [
  { role_id: 'a', name: 'Cargo A', create: true, edit: false, delete: false, configure: false },
  { role_id: 'b', name: 'Cargo B', create: false, edit: false, delete: false, configure: false }
]

describe('configuração dos cargos', () => {
  it('as quatro ações, na ordem da tela', () => {
    expect(ROLE_ACTIONS.map((a) => a.key)).toEqual(['create', 'edit', 'delete', 'configure'])
    expect(ROLE_ACTIONS.map((a) => a.label)).toEqual([
      'Criar eventos',
      'Editar eventos',
      'Excluir eventos',
      'Configurar eventos'
    ])
  })

  it('só o dono liga e desliga a quarta (configurar)', () => {
    expect(ROLE_ACTIONS.filter((a) => a.ownerOnly).map((a) => a.key)).toEqual(['configure'])
  })

  it('liga uma ação só no cargo certo', () => {
    const out = withAction(roles, 'b', 'edit', true)
    expect(out[1]).toEqual({ role_id: 'b', name: 'Cargo B', create: false, edit: true, delete: false, configure: false })
    expect(out[0]).toBe(roles[0])
  })

  it('desliga uma ação e mantém as outras', () => {
    expect(withAction([{ ...roles[0], edit: true }], 'a', 'create', false)[0]).toMatchObject({
      create: false,
      edit: true
    })
  })

  it('não muda a lista original', () => {
    withAction(roles, 'a', 'delete', true)
    expect(roles[0].delete).toBe(false)
  })

  it('cargo desconhecido deixa tudo como está', () => {
    expect(withAction(roles, 'zzz', 'edit', true)).toEqual(roles)
  })
})
