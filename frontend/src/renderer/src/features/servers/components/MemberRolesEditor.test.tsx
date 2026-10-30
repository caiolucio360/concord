import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import MemberRolesEditor, { RoleOption } from './MemberRolesEditor'
import type { Role } from '../lib/permissions'

const role = (id: string, name: string): Role =>
  ({ id, name, server_id: 's1', color: null, position: 1, permissions: 0, hoist: false, is_default: false }) as Role

const noop = (): void => {}

describe('MemberRolesEditor', () => {
  it('pílula removível tem o botão de tirar com rótulo; o + aparece para quem pode dar', () => {
    const mod = role('r1', 'Mod')
    const html = renderToStaticMarkup(
      <MemberRolesEditor name="Ana" own={[mod]} memberRoleIds={['r1']} assignable={[mod]} editable onToggle={noop} />
    )
    expect(html).toContain('aria-label="Tirar o cargo Mod de Ana"')
    expect(html).toContain('aria-label="Dar um cargo a Ana"')
    expect(html).not.toContain('×')
    expect(html).toMatch(/aria-label="Tirar o cargo Mod de Ana"[^>]*><svg/)
  })
})

describe('RoleOption', () => {
  it('marca só o cargo que o membro tem', () => {
    const marked = renderToStaticMarkup(<RoleOption role={role('r1', 'Mod')} has onToggle={noop} />)
    expect(marked).toMatch(/<svg[^>]*text-success/)
    expect(marked).not.toContain('✓')
    expect(renderToStaticMarkup(<RoleOption role={role('r1', 'Mod')} has={false} onToggle={noop} />)).not.toContain('text-success')
  })
})
