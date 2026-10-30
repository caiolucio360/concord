import type { Role, ServerMember } from '../api/members'

// Porte do desktop (frontend/src/renderer/src/features/servers/lib/memberGroups.ts): mesma regra, como o Discord.

export interface MemberGroup {
  /** Chave estável: "role:<id>", "members" ou "offline". */
  key: string
  title: string
  members: ServerMember[]
}

/** Cargos da pessoa (sem o @everyone), do mais alto para o mais baixo. */
const rolesOf = (roles: Role[], roleIds: string[] | undefined): Role[] => {
  const own = new Set(roleIds ?? [])
  return roles.filter((r) => !r.is_default && own.has(r.id)).sort((a, b) => b.position - a.position)
}

/** Cor CSS (#rrggbb) do cargo mais alto da pessoa que tem cor; sem cargo colorido, undefined. */
export function memberColorCss(roles: Role[], roleIds: string[] | undefined): string | undefined {
  const color = rolesOf(roles, roleIds).find((r) => r.color != null)?.color
  return color == null || color < 0 ? undefined : `#${color.toString(16).padStart(6, '0')}`
}

/**
 * Online separados por cargo "exibido separadamente" (do mais alto; cada pessoa só no grupo do seu cargo mais alto
 * desses, o cargo de sistema por último), os demais online em "Membros" e todos os offline no fim.
 */
export function groupMembers({ members, roles, isOnline }: { members: ServerMember[]; roles: Role[]; isOnline: (userId: string) => boolean }): MemberGroup[] {
  const hoisted = roles
    .filter((r) => r.hoist && !r.is_default)
    .sort((a, b) => (Boolean(a.is_system) !== Boolean(b.is_system) ? (a.is_system ? 1 : -1) : b.position - a.position))
  const online = members.filter((m) => isOnline(m.user_id))
  const offline = members.filter((m) => !isOnline(m.user_id))
  const groups: MemberGroup[] = []
  const placed = new Set<string>()
  for (const role of hoisted) {
    const inRole = online.filter((m) => !placed.has(m.user_id) && m.role_ids?.includes(role.id))
    if (inRole.length === 0) continue
    inRole.forEach((m) => placed.add(m.user_id))
    groups.push({ key: `role:${role.id}`, title: role.name, members: inRole })
  }
  const regular = online.filter((m) => !placed.has(m.user_id))
  if (regular.length > 0) groups.push({ key: 'members', title: 'Membros', members: regular })
  if (offline.length > 0) groups.push({ key: 'offline', title: 'Offline', members: offline })
  return groups
}
