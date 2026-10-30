import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { isCardMenu, keepsCardOpen, placeProfileCard, PROFILE_CARD_WIDTH } from '../lib/profileCard'
import type { ProfileCardTarget } from '../store/profileCardStore'
import { useUserMenuStore } from '../store/userMenuStore'

/**
 * Posiciona o cartão ao lado do item clicado, dentro da janela, e fecha com
 * clique fora, Esc ou ao redimensionar. `remeasure`: o que muda a altura do
 * cartão depois de aberto (perfil, badges, em comum, live...).
 */
export function useProfileCardPlacement(
  target: ProfileCardTarget,
  close: () => void,
  remeasure: readonly unknown[]
): { ref: React.RefObject<HTMLDivElement | null>; pos: { left: number; top: number } | null } {
  const ref = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    if (!ref.current) {
      setPos(null)
      return
    }
    const { height } = ref.current.getBoundingClientRect()
    setPos(
      placeProfileCard(
        target.anchor,
        target.side,
        { width: PROFILE_CARD_WIDTH, height },
        { width: window.innerWidth, height: window.innerHeight }
      )
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ...remeasure])

  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (!keepsCardOpen(e.target as Node, ref.current, target.anchorEl)) close()
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
    }
  }, [target, close])

  // O menu "Mais" aberto por este cartão fecha junto com ele.
  useEffect(() => {
    return () => {
      if (isCardMenu(useUserMenuStore.getState().target, target.userId)) {
        useUserMenuStore.getState().close()
      }
    }
  }, [target.userId])

  return { ref, pos }
}
