# 0029. Serviço em primeiro plano da chamada no app mobile (notifee)

- Status: proposto
- Data: 2026-10-30

## Contexto

O [ADR 0023](0023-voz-no-app-mobile.md) deixou o serviço em primeiro plano como "risco a confirmar no aparelho".
No teste em produção a chamada caía quando a pessoa ia para outra tela (inclusive transmitindo a tela). Reproduzido
no emulador: Home em chamada, 28 s depois o LiveKit fecha a conexão (`PEER_CONNECTION_DISCONNECTED`) e o backend tira
a pessoa da call ("não está na mídia"). Causa: com o app em segundo plano o React Native pausa os timers (o ping do
LiveKit para) e o Android 14 corta o microfone de quem não tem serviço em primeiro plano do tipo `microphone`.

## Opções consideradas

1. **`@notifee/react-native`**: serviço em primeiro plano com uma tarefa headless que mantém o JavaScript rodando
   (`registerForegroundService`). É o caminho que a documentação do LiveKit para React Native indica. Escolhida.
2. **Módulo nativo próprio (Kotlin, módulo do Expo)**: sem dependência nova, mas é código nativo a manter
   (serviço, notificação, tarefa headless e as regras de cada versão do Android). Descartada pelo custo.
3. **Só o serviço de captura do WebRTC**: existe apenas enquanto se transmite a tela e não mantém os timers do
   JavaScript. Não resolve a chamada de voz. Descartada.

## Decisão

- Dependência nova: `@notifee/react-native` (9.x), só no `mobile/`.
- O config plugin `plugins/withCallForegroundService.js` sobrescreve o tipo do serviço do notifee (que vem como
  `shortService`, encerrado em ~3 min) para `microphone|camera` e declara `FOREGROUND_SERVICE_MICROPHONE` e
  `FOREGROUND_SERVICE_CAMERA`.
- O serviço liga quando a chamada começa (fases `outgoing`, `connecting`, `active`, `reconnecting`) e desliga quando
  ela termina, com a notificação fixa "Você está em uma chamada" no canal `chamada-ativa` (importância baixa).
- Só `src/features/call/lib/notifeeForeground.ts` fala com o notifee; a regra de quando ligar fica em
  `callForeground.ts`, testada com uma porta falsa (mesmo padrão do `CallMedia`, ADR 0023).

## Consequências

- A chamada continua com o app em segundo plano e a tela apagada, como no Discord; a notificação fixa aparece
  enquanto houver chamada.
- A câmera em segundo plano usa o mesmo serviço (tipo `camera`), sem outra dependência.
- O notifee traz permissões que o app não usa (alarme exato, inicialização no boot); não fazem nada sem código que
  as use.
