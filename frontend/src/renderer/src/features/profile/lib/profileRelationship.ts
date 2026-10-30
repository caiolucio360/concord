import type { PublicProfile } from '../api/users'

/** Vínculo de quem vê com a pessoa (backend: internal/relationship). */
export type ProfileRelationship = 'self' | 'friend' | 'shared_server' | 'none'

/**
 * Sem vínculo (nem amizade nem servidor em comum): o cartão não mostra o @
 * nem os atalhos de mensagem e amizade. Vale o vínculo do perfil carregado;
 * enquanto ele não chega, o de onde o cartão foi aberto (ranking).
 */
export function isStranger(
  loaded?: ProfileRelationship,
  fromTarget?: ProfileRelationship
): boolean {
  return (loaded ?? fromTarget) === 'none'
}

/**
 * Perfil novo por cima do guardado. O evento user:update vai para todo mundo
 * e não traz vínculo: fica o vínculo de antes e, sem vínculo, sem o @.
 */
export function mergeProfile(prev: PublicProfile | undefined, next: PublicProfile): PublicProfile {
  const relationship = next.relationship ?? prev?.relationship
  if (!relationship) return next
  return { ...next, relationship, username: relationship === 'none' ? '' : next.username }
}
