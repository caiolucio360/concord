/**
 * O GIF do avatar na chamada só anima enquanto a pessoa fala e fica parado no resto do tempo (mesma regra do
 * desktop e da web; sem mouse no celular, não há o "em cima do avatar"). Quem está mudo não fala.
 */
export function callAvatarAnimate({ speaking }: { speaking: boolean }): boolean {
  return speaking
}
