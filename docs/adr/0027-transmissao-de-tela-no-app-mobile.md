# 0027. Transmitir e assistir tela no app mobile (MediaProjection e assinatura sob demanda)

- Status: proposto
- Data: 2026-10-29

## Contexto

O [ADR 0023](0023-voz-no-app-mobile.md) deixou câmera e captura de tela para outra decisão. No teste do APK de
produção veio o pedido: "não é possível streamar a tela". No desktop quem abre uma transmissão publica a faixa
`ScreenShare` no LiveKit e os outros escolhem assistir (a sala conecta com `autoSubscribe: false` e o vídeo só
desce para quem assiste).

## Opções consideradas

1. **Só assistir, sem transmitir.** Menos código nativo, mas metade do pedido. Descartada.
2. **Transmitir e assistir com o SDK que já temos** (`room.localParticipant.setScreenShareEnabled`, faixa remota
   desenhada com o `VideoView` do `@livekit/react-native`). Sem dependência nova. Escolhida.
3. **Biblioteca de captura própria.** Mais controle de qualidade, mas é módulo nativo novo. Descartada.

## Decisão

- Sem dependência nova. A porta `CallMedia` ganha `setScreenShareEnabled`, `onScreens` e `watchScreen`; só
  `livekitMedia.ts` e `livekitScreen.tsx` falam com o SDK.
- Android: permissão `FOREGROUND_SERVICE_MEDIA_PROJECTION`. O sistema mostra o pedido de captura de tela
  (MediaProjection) quando a pessoa liga; negar volta ao estado desligado com um aviso.
- Assistir é sob demanda: ao chegar uma transmissão o app desassina o vídeo e só assina quando a pessoa toca em
  "Assistir" (uma transmissão por vez). Sem isso, qualquer transmissão consumiria rede de todo mundo.
- Tocam os sons `liveStart` e `liveEnd` (ADR 0025) quando alguém abre ou encerra uma transmissão.

## Consequências

- **Não verificado em aparelho:** o pedido de captura, o serviço em primeiro plano e a qualidade do vídeo.
  Exige APK novo (permissão no manifesto).
- Sem áudio da transmissão, sem escolher qualidade, sem pedido de entrada ("JoinRequests") e sem permissão
  de transmitir por cargo: ficam para outra decisão junto com a câmera.
