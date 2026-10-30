type RoomLike = { engine?: { pcManager?: { publisher?: Record<string, unknown> } } }

/**
 * Desliga o `x-google-start-bitrate` do livekit-client (2.23): ele entra só na primeira faixa de vídeo e, com uma
 * segunda (câmera e tela, ou duas transmissões), o WebRTC do Android recusa o SDP por colisão de codec no BUNDLE e a
 * transmissão cai. Marcar como "já aplicado" antes de publicar vídeo deixa todas as faixas com o mesmo fmtp; o custo
 * é a imagem começar alguns segundos mais leve. Campo interno do SDK: devolve false se ele não existir.
 */
export function disableVideoStartBitrate(room: RoomLike): boolean {
  const publisher = room.engine?.pcManager?.publisher
  if (!publisher) return false
  publisher.hasAppliedVideoStartBitrate = true
  return true
}
