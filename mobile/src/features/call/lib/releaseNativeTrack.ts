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
