import { disableVideoStartBitrate } from './startBitrate'

// Regressão: o livekit-client 2.23 põe x-google-start-bitrate no fmtp do VP8 só da primeira faixa de vídeo. Com uma
// segunda faixa (câmera e depois tela, ou duas transmissões seguidas) o WebRTC do Android recusa o SDP ("BUNDLE group
// contains a codec collision"): quem transmite cai e quem assiste reconecta (visto no emulador e nos logs de produção).
describe('disableVideoStartBitrate', () => {
  it('marca o ajuste como já aplicado no publicador: o SDP nunca ganha o parâmetro e as faixas ficam iguais', () => {
    const publisher: Record<string, unknown> = {}
    const ok = disableVideoStartBitrate({ engine: { pcManager: { publisher } } })
    expect(ok).toBe(true)
    expect(publisher.hasAppliedVideoStartBitrate).toBe(true)
  })

  it('sem publicador (versão do SDK diferente) não quebra e avisa que não aplicou', () => {
    expect(disableVideoStartBitrate({ engine: {} })).toBe(false)
    expect(disableVideoStartBitrate({})).toBe(false)
  })
})
