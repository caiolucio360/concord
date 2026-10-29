# 0028. Emojis personalizados por servidor e pack base vindo do emojibase

- Status: aceito
- Data: 2026-10-29

## Contexto

Proposta #426: subir emojis próprios por servidor (com limite), usar os emojis
de qualquer servidor de que a pessoa faz parte em qualquer outro lugar (como no
Discord, com o ícone do servidor no seletor) e ampliar o pack base, que hoje são
~40 emojis escritos à mão em `features/chat/lib/emotes.ts`. Pedido explícito: o
pack base vem de uma **API pública externa**, e o upload fica na aba Emojis do
seletor.

O cliente só conecta no nosso servidor (CSP `connect-src` do `index.html`), e
já existe um domínio parecido: figurinhas por servidor (`internal/sticker`).

## Opções consideradas

Pack base:

1. **Cliente chama a API externa** (emojibase no jsDelivr). Abre o
   `connect-src` da CSP para um CDN de terceiros e expõe o IP de cada pessoa.
2. **emoji-api.com**: precisa de chave e dá limite por chave.
3. **Backend busca o emojibase no jsDelivr e serve `GET /api/emojis/base`**,
   com cache em memória, como já faz com o Giphy (`internal/giphy`). Sem chave,
   sem dependência nova, CSP intocada.

Formato no texto da mensagem:

1. `:nome:` puro: ambíguo entre servidores e quebra se renomear.
2. `<:nome:id>` (o do Discord): o id resolve a imagem; o nome é o que aparece
   para quem não pode ver o emoji.

## Decisão

- Pack base: opção 3. Fonte fixa `emojibase-data@16.0.3/pt/compact.json` e
  `pt/messages.json` (rótulos e grupos em português, Unicode 16, que as fontes
  de emoji do Windows/Android atuais desenham). O backend enxuga para
  `{emoji, label, keywords, group}`, guarda na memória sem TTL (a versão é fixa) e, se o CDN falhar,
  o app cai no pack local de hoje.
- Emoji personalizado: tabela `server_emojis`, domínio novo
  `internal/emoji`, copiado do desenho das figurinhas. Limite de **50 por
  servidor**, até **256 KB**, PNG/JPEG/WEBP/AVIF/GIF (GIF animado liberado: não
  há Nitro), nome com 2–32 caracteres `[A-Za-z0-9_]`, único no servidor.
- Permissão nova `ADD_EMOJIS` (1<<15, bit livre); a migration dá ao @everyone
  e ao Moderador, como foi com `ADD_STICKERS`. Apagar emoji dos outros segue
  `MANAGE_EXPRESSIONS`.
- No texto: `<:nome:id>`. Na reação: `<:id>` (cabe no limite de 64 da coluna;
  `ValidateEmoji` aceita esse formato além do Unicode curto).
- Visibilidade: `GET /api/emojis` devolve os emojis de **todos os servidores de
  que a pessoa é membro**, agrupados com nome e ícone do servidor. O arquivo
  (`/emojis/:id/file`) só é entregue a membros do servidor do emoji. Quem não é
  membro vê `:nome:` no texto e na reação.
- Mobile fica para outra issue; até lá ele mostra o token como texto.

## Consequências

- O primeiro `GET /api/emojis/base` depois do boot espera o CDN (~600 KB uma
  vez); os seguintes saem da memória.
- Sair do servidor tira os emojis dele do seletor e das mensagens dessa pessoa
  (viram `:nome:`), mesmo nas mensagens antigas.
- Apagar o emoji deixa `:nome:` onde ele foi usado (o token fica no texto).

## Fontes

- emojibase (MIT): https://emojibase.dev / https://www.jsdelivr.com/package/npm/emojibase-data
- emoji-api.com e EmojiFYI (avaliadas, descartadas por chave/limite de uso)
- Discord, formato `<:name:id>`: https://discord.com/developers/docs/reference#message-formatting
