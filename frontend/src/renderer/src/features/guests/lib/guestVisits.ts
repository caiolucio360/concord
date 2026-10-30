// As visitas de quem tem conta: cada acesso de visitante ativo vira um item no
// trilho de servidores e abre em /visitas/<servidor> (só a call do convite).
// Um acesso por servidor (o do convite mais novo vale). Puro.

/** O mínimo de um acesso que as funções daqui usam. */
interface VisitLike {
  server_id: string
  expires_at: string
}

const VISIT_PREFIX = '/visitas/'

export function visitPath(serverId: string): string {
  return `${VISIT_PREFIX}${serverId}`
}

/** O servidor da visita aberta no caminho (ou null fora de /visitas/). */
export function visitServerOf(path: string): string | null {
  const match = /^\/visitas\/([^/]+)/.exec(path)
  return match ? match[1] : null
}

/** Novo acesso ou o mesmo com o canal trocado (mover): substitui o do servidor. */
export function upsertVisit<T extends VisitLike>(list: T[], pass: T): T[] {
  const at = list.findIndex((v) => v.server_id === pass.server_id)
  if (at < 0) return [...list, pass]
  return list.map((v, i) => (i === at ? pass : v))
}

export function removeVisit<T extends VisitLike>(list: T[], serverId: string): T[] {
  return list.filter((v) => v.server_id !== serverId)
}

/** As que ainda valem (o servidor encerra as vencidas a cada 30 s). */
export function liveVisits<T extends VisitLike>(list: T[], now: number): T[] {
  return list.filter((v) => Date.parse(v.expires_at) > now)
}

export function visitOf<T extends VisitLike>(
  list: T[],
  serverId: string | undefined,
  now: number
): T | null {
  if (!serverId) return null
  return liveVisits(list, now).find((v) => v.server_id === serverId) ?? null
}

/**
 * As visitas que o trilho mostra: sem as de servidor de que já sou membro (quem
 * virou membro tem o ícone normal do servidor, não dois).
 */
export function visitsOutsideServers<T extends VisitLike>(list: T[], memberOf: string[]): T[] {
  const member = new Set(memberOf)
  return list.filter((v) => !member.has(v.server_id))
}

export type VisitPageTarget = { kind: 'visit' } | { kind: 'wait' } | { kind: 'go'; path: string }

export interface VisitPageInput {
  serverId: string
  /** Sou membro do servidor (está na lista de servidores). */
  member: boolean
  visit: { channel_id: string } | null
  /** Já leu as visitas do servidor. */
  loaded: boolean
  /** Acabei de virar membro: o canal da call em que eu estava como visitante. */
  joinedChannel?: string
}

/**
 * O que /visitas/<servidor> faz: quem é membro (ou acabou de virar) vai para o
 * servidor, no canal da call; visitante abre a visita; sem visita, espera a
 * lista ou volta ao Início.
 */
export function visitPageTarget(input: VisitPageInput): VisitPageTarget {
  const channel = input.joinedChannel ?? (input.member ? input.visit?.channel_id : undefined)
  if (channel) return { kind: 'go', path: `/servers/${input.serverId}/channels/${channel}` }
  if (input.member) return { kind: 'go', path: `/servers/${input.serverId}` }
  if (input.visit) return { kind: 'visit' }
  return input.loaded ? { kind: 'go', path: '/friends' } : { kind: 'wait' }
}
