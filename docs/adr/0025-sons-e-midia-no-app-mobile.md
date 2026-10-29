# 0025. Sons da chamada e reprodução de áudio no app mobile com o `expo-audio`

- Status: proposto
- Data: 2026-10-29

## Contexto

O desktop toca efeitos sonoros (mutar, desmutar, entrar, sair, alguém entrar...) sintetizados com WebAudio a partir de
notas (`features/call/lib/sounds.ts`), sem arquivos de áudio. O app Android não tinha nenhum som: ao mutar nada
tocava (item 6 do teste do APK de produção). O app também vai precisar tocar áudio e vídeo de anexos.

## Opções consideradas

1. **Gerar arquivos WAV e empacotar como assets.** Simples, mas duplica as notas do desktop em binários e
   aumenta o APK. Descartada.
2. **Sintetizar o WAV no app a partir das mesmas notas e tocar com um player.** Escolhida.
3. **`react-native-audio-api` (WebAudio nativo).** Reaproveitaria o código do desktop, mas é uma dependência maior
   e menos madura que as do Expo. Descartada.

## Decisão

- Dependência nova: `expo-audio` (oficial do Expo SDK 58), só para reprodução por enquanto.
- As notas dos sons ficam em `features/call/lib/sounds/soundNotes.ts` (mesmas frequências do desktop);
  `synthWav.ts` renderiza cada som em WAV PCM 16 bits e devolve um `data:` URI; `soundPlayer.ts` guarda um player
  por som. O player recebe uma porta falsa nos testes e nunca lança.
- Mutar, desmutar, ensurdecer, entrar, sair e a entrada/saída de outras pessoas tocam o som.
- Vídeo, gravação de áudio e seleção de arquivos (`expo-video`, `expo-image-picker`, `expo-document-picker`)
  serão decididos em ADR próprio quando o envio de anexos entrar.

## Consequências

- Exige APK novo (módulo nativo). Os jingles de nível entram quando o XP/níveis chegarem ao app.
- Não verificado em aparelho: reprodução de `data:` URI pelo ExoPlayer e mistura com o áudio da chamada.
