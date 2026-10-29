# 0026. Enviar anexos no app mobile com `expo-image-picker` e `expo-document-picker`

- Status: proposto
- Data: 2026-10-29

## Contexto

O chat do desktop envia fotos, vídeos e áudios (até 10 por mensagem, 25 MB cada): cada arquivo sobe assim que
é escolhido (`POST /channels|conversations/:id/attachments`, com progresso) e a mensagem é criada com os ids.
O app só mostrava anexos recebidos. Pedido do teste do APK de produção: ter tudo que o desktop tem.

## Opções consideradas

1. **Só o seletor de arquivos do sistema (`expo-document-picker`).** Cobre tudo, mas a galeria e a câmera ficam
   escondidas atrás de um menu genérico. Descartada.
2. **Seletor de imagens + seletor de arquivos.** Galeria e câmera nativas e um caminho para áudios e outros
   arquivos. Escolhida.
3. **`react-native-image-crop-picker`.** Mais recursos, mas é módulo de terceiros com manutenção irregular
   no SDK 58. Descartada.

## Decisão

- Dependências novas (oficiais do Expo SDK 58): `expo-image-picker` (galeria e câmera) e `expo-document-picker`.
- O upload usa `XMLHttpRequest` + `FormData` com o arquivo como `{ uri, name, type }` (o React Native lê do disco);
  progresso, cancelamento e renovação do token no 401 como no desktop (`api/upload.ts`).
- Regras de tipos e limites iguais às do backend (`lib/attachments.ts`); rascunho em `hooks/useAttachmentDraft.ts`.
- Permissão de câmera declarada pelo plugin do `expo-image-picker`, sem pedir microfone.

## Consequências

- Exige APK novo (módulos nativos). Tocar vídeo e áudio dentro do app (`expo-video`/`expo-audio`) fica para
  outra decisão: por ora esses anexos abrem no player do aparelho.
- O texto da permissão da câmera é texto de interface: precisa de aprovação humana.
