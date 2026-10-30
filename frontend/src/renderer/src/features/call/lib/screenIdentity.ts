// A live pelo motor nativo entra na sala como outro participante,
// `<userId>:screen` (token próprio, só tela; ver docs/adr/0031). Quem assiste
// atribui a tela e o som dela ao usuário dono — o resto do app não muda.

const SUFFIX = ':screen'

export function screenHelperIdentity(userId: string): string {
  return `${userId}${SUFFIX}`
}

export function isScreenHelper(identity: string): boolean {
  return identity.length > SUFFIX.length && identity.endsWith(SUFFIX)
}

/** De quem é a mídia desse participante (o próprio, ou o dono do helper). */
export function mediaOwner(identity: string): string {
  return isScreenHelper(identity) ? identity.slice(0, -SUFFIX.length) : identity
}
