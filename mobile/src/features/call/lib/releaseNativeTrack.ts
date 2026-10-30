/**
 * Libera a faixa nativa do WebRTC. Só parar a faixa desliga a captura, mas o serviço em primeiro plano de
 * captura de tela do Android (e o ícone/notificação) só acaba quando a faixa é liberada.
 */
export function releaseNativeTrack(track: unknown): void {
  const release = (track as { release?: () => void } | null | undefined)?.release
  if (typeof release !== 'function') return
  try {
    release.call(track)
  } catch {
    // Já liberada ou módulo indisponível: quem chamou está encerrando de qualquer jeito.
  }
}

/**
 * As faixas nativas que eu publiquei (tela e câmera), para liberar mesmo quando o LiveKit já limpou as publicações
 * (sala derrubada pelo servidor ou por outro aparelho da mesma conta): sem isso o serviço de captura fica preso.
 */
export function createNativeTracks() {
  const kept = new Set<unknown>()
  return {
    keep(track: unknown): void {
      if (track) kept.add(track)
    },
    release(track: unknown): void {
      if (!kept.delete(track)) return
      releaseNativeTrack(track)
    },
    releaseAll(): void {
      kept.forEach((track) => releaseNativeTrack(track))
      kept.clear()
    }
  }
}
