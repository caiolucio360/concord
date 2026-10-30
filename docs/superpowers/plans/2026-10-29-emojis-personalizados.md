# Emojis personalizados (#426) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** cada servidor sobe até 50 emojis próprios pela aba Emojis do seletor; quem é membro usa esses emojis (no texto e em reações) em qualquer servidor/DM; o pack base passa a vir do emojibase (API pública externa) via backend.

**Architecture:** domínio novo `backend/internal/emoji` (cópia do desenho de `internal/sticker`) + proxy com cache do emojibase (padrão `internal/giphy`). No app, feature nova `features/emojis/` (api, lib de tokens, store, componentes) plugada no `EmojisTab`, no seletor de reações, no `MessageText` e nos chips de reação. Decisões em [ADR 0028](../../adr/0028-emojis-personalizados.md).

**Tech Stack:** Go 1.26 + Gin + pgx; React + Zustand + Tailwind v4; vitest (SSR, sem jsdom).

## Global Constraints

- Limite: **50 emojis por servidor**; arquivo até **256 KB** (`262144` bytes).
- Formatos: PNG, JPEG, WEBP, AVIF, GIF (animado liberado).
- Nome: 2–32 caracteres `[A-Za-z0-9_]`, único por servidor (sem diferenciar maiúsculas).
- Token no texto: `<:nome:id>`; token de reação: `<:id>` (id = UUID).
- Permissão nova `ADD_EMOJIS = 1 << 15`; apagar emoji dos outros = `MANAGE_EXPRESSIONS`.
- Pack base: `https://cdn.jsdelivr.net/npm/emojibase-data@16.0.3/pt/compact.json` + `pt/messages.json`, cache sem TTL (versão fixa); falha → app usa `EMOTE_CATEGORIES` local.
- Visibilidade: só membros do servidor do emoji veem a imagem; os outros veem `:nome:`.
- Sem dependência nova. CRAP ≤ 15 em toda função tocada. `message/service.go` (god file) sai menor.
- Texto de UI só o aprovado na seção "Textos" abaixo. Mobile fora do escopo.

## Desempenho (pedido do usuário: sempre a solução mais performática)

- **Pack base sem TTL:** a versão do emojibase é fixa (`16.0.3`), então o conteúdo nunca muda. O backend busca uma vez por processo (singleflight, aquecido em goroutine no boot), guarda os **bytes JSON já serializados** + ETag e serve com `Cache-Control: private, max-age=86400` (a URL não muda entre versões; ver ADR). Falha fica guardada 1 min. Trocar a versão = deploy.
- **Arquivo do emoji imutável:** id novo a cada upload, arquivo nunca muda → `Cache-Control: private, max-age=31536000, immutable`. No app a URL de cada id é montada **uma vez por sessão** (mapa id→url no store, com o media token do momento) para o navegador reaproveitar cache e imagem decodificada em todas as mensagens; `<img>` com `width/height` fixos, `loading="lazy"`, `decoding="async"`.
- **Seletor com ~1.900 emojis:** cada categoria só monta os botões quando chega perto da área visível (`IntersectionObserver` com placeholder de altura calculada; sem dependência), mais `content-visibility: auto`. Busca usa um `haystack` minúsculo/sem acento pré-calculado uma vez por emoji e devolve no máximo 200 resultados.
- **Texto da mensagem:** `splitCustomEmojis` só roda se `content.includes('<:')`; regex global único, linear. `byId` é `Record` (O(1)); seletores zustand com referência estável.
- **Lista dos meus emojis:** uma consulta (JOIN) por sessão; depois só eventos de ws (`emoji:created`/`emoji:deleted`) — invalidação explícita, sem polling.

## Textos (aprovação humana)

| Onde | Texto |
|---|---|
| Aba Emojis, contador | `{n} / 50 emojis` |
| Aba Emojis, botão | `Novo emoji` |
| Aba Emojis, cabeçalho do servidor | nome do servidor (com ícone) |
| Modal, título | `Novo emoji` |
| Modal, campo | `Nome` (placeholder `nome_do_emoji`) |
| Modal, dica | `PNG, JPEG, WEBP, AVIF ou GIF, até 256 KB. O ideal é 128×128.` |
| Modal, botões | `Enviar` / `Cancelar` |
| Modal, nome inválido | `O nome precisa ter de 2 a 32 letras, números ou _.` |
| Excluir (title) | `Excluir emoji` |
| Toast ao falhar exclusão | `Não foi possível excluir o emoji.` |
| Modal, erro técnico no envio | `Não foi possível enviar o emoji.` (aprovado depois da revisão) |
| Erro: nome repetido (409) | `Já existe um emoji com esse nome neste servidor.` |
| Erro: limite (409) | `Este servidor já tem 50 emojis.` |
| Erro: permissão (403) | `Você não tem permissão para adicionar emojis neste servidor.` |
| Erro: tamanho (413) | `Arquivo grande demais (máx. 256 KB).` |
| Erro: formato (415) | `Só imagens PNG, JPEG, WEBP, AVIF ou GIF.` |
| Cargos | `Adicionar emojis` — `Enviar emojis novos para este servidor.` |
| changelog/next.md | `Emojis personalizados: cada servidor pode ter até 50 emojis próprios, enviados pela aba Emojis, e você usa os emojis dos seus servidores em qualquer conversa. O seletor também ganhou o pacote completo de emojis.` |

## Mapa de arquivos

Backend
- Create `backend/migrations/000174_create_server_emojis.{up,down}.sql` — tabela + `ADD_EMOJIS` nos cargos.
- Modify `backend/internal/permission/perms.go`, `testdata/vectors.json` — bit novo.
- Create `backend/internal/message/reaction_emoji.go` (+ `_test.go`) — `ValidateEmoji` sai de `service.go` e aceita `<:uuid>`.
- Create `backend/internal/emoji/{model,repository,handler,upload,base,routes}.go` + `emoji_test.go`, `base_test.go`.
- Create `backend/cmd/wire_emojis.go`; Modify `backend/cmd/wire_chat.go` (uma linha: `a.wireEmojis()`).

Frontend (`frontend/src/renderer/src/`)
- Modify `features/servers/lib/permissions.ts`, `permissionCatalog.ts`.
- Create `features/emojis/lib/emojiToken.ts` (+test) — formatar/parsear tokens, validar nome.
- Create `features/emojis/lib/baseEmojis.ts` (+test) — resposta do `/emojis/base` → `EmoteCategory[]`, busca.
- Create `features/emojis/api/emojis.ts` — REST + upload XHR + URL do arquivo.
- Create `features/emojis/store/emojiStore.ts` (+test) — grupos por servidor, índice por id, pack base, ws.
- Create `features/emojis/components/{CustomEmoji,ReactionEmoji,CustomEmojiSections,EmojiUploadModal}.tsx` (+tests SSR).
- Modify `features/chat/lib/linkify.ts` (`messageParts` separa emojis), `components/MessageText.tsx`, `components/ReactionChips.tsx` (+`ReactionTooltip.tsx` se mostra o emoji), `components/EmojisTab.tsx`, `components/EmotePickerPopover.tsx`, `components/UnifiedMediaPickerPopover.tsx` (usa `useEmotePickerDismiss`-like hook extraído: `hooks/usePickerDismiss.ts`), `store/wsEvents/dispatch.ts`.
- Docs: `docs/CARGOS.md`, `changelog/next.md`.

---

### Task 1: refactor — `ValidateEmoji` sai do `service.go` (commit estrutural)

**Files:** Create `backend/internal/message/reaction_emoji.go`, `reaction_emoji_test.go`; Modify `service.go:93-103` (remover).

- [ ] Mover `ValidateEmoji` e `ErrInvalidEmoji` sem mudar comportamento; teste cobrindo vazio, >32 bytes, espaço, controle, `👍` ok.
- [ ] `go test ./internal/message` verde. Commit `refactor(mensagens): validação de emoji de reação em arquivo próprio`.

### Task 2: reação aceita `<:uuid>`

- [ ] Teste falhando: `ValidateEmoji("<:"+uuid+">") == nil`; `"<:nao-uuid>"` e `"<:"+uuid` (sem `>`) dão erro.
- [ ] Implementar:

```go
// customPrefix/customSuffix: reação com emoji personalizado é "<:id>" (ADR 0028).
func ValidateEmoji(emoji string) error {
	if id, ok := customReactionID(emoji); ok {
		if _, err := uuid.Parse(id); err != nil {
			return ErrInvalidEmoji
		}
		return nil
	}
	return validateUnicodeEmoji(emoji) // o corpo antigo
}

func customReactionID(emoji string) (string, bool) {
	if !strings.HasPrefix(emoji, "<:") || !strings.HasSuffix(emoji, ">") {
		return "", false
	}
	return emoji[2 : len(emoji)-1], true
}
```

- [ ] Verde; commit `feat(mensagens): reação com emoji personalizado`.

### Task 3: permissão `ADD_EMOJIS` + migration

- [ ] `perms.go`: `AddEmojis int64 = 1 << 15` (comentário ADR 0028), em `Names`, `All`, `DefaultEveryone`. `vectors.json`: `bits.ADD_EMOJIS = 32768`, `defaults.everyone += "ADD_EMOJIS"`. Testes de vetores falham antes de mexer no `permissions.ts` do app — mexer junto: `Perm.ADD_EMOJIS: 1 << 15`, `DEFAULT_EVERYONE |= ADD_EMOJIS`, entrada no `permissionCatalog.ts` logo depois de `ADD_STICKERS`.
- [ ] Migration `000174_create_server_emojis.up.sql`:

```sql
-- Emojis personalizados por servidor (docs/adr/0028-emojis-personalizados.md).
CREATE TABLE server_emojis (
    id UUID PRIMARY KEY,
    server_id UUID NOT NULL REFERENCES servers (id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name VARCHAR(32) NOT NULL CHECK (name ~ '^[A-Za-z0-9_]{2,32}$'),
    content_type VARCHAR(64) NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes BETWEEN 1 AND 262144),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_server_emojis_name ON server_emojis (server_id, lower(name));

-- ADD_EMOJIS (1<<15 = 32768): @everyone e Moderador, como a 000125 fez com figurinhas.
UPDATE roles SET permissions = permissions | 32768 WHERE is_default;
UPDATE roles SET permissions = permissions | 32768 WHERE name = 'Moderador' AND NOT is_default;
```

  down: `DROP TABLE server_emojis; UPDATE roles SET permissions = permissions & ~32768;`
- [ ] `go test ./internal/permission` + `npx vitest run src/renderer/src/features/servers/lib/permissions.test.ts`. `docs/CARGOS.md` ganha a linha. Commit `feat(cargos): permissão Adicionar emojis`.

### Task 4: `internal/emoji` — model, repositório, upload, listagem, arquivo, exclusão

Copiar `internal/sticker` trocando nomes. Diferenças:

- `model.go`: `MaxEmojiBytes int64 = 256 << 10`, `MaxEmojisPerServer = 50`, `nameRe = regexp.MustCompile("^[A-Za-z0-9_]{2,32}$")`; `ErrNameTaken`; `Emoji{ID, ServerID, UploaderID, Name, ContentType, SizeBytes, CreatedAt}`; `ServerEmojis{ServerID, ServerName, ServerIconURL *string, Emojis []Emoji}`; eventos `emoji:created` / `emoji:deleted` na sala `server:<id>`.
- `repository.go`: `Create` (violação `23505` → `ErrNameTaken`), `ListForUser(ctx, userID) ([]ServerEmojis, error)` (JOIN `server_members` + `servers`, ordenado por nome do servidor e `created_at`), `FindByID`, `CountByServer`, `Delete`.
- `upload.go`: igual ao das figurinhas com `permission.AddEmojis`; `allowedImage` = png/jpeg/webp/gif + AVIF detectado à parte (`isAVIF(head)`: bytes 4..8 `ftyp` e marca `avif`/`avis`), já que `media.Sniff` não conhece AVIF; mensagens de erro com os textos aprovados.
- `handler.go`: `ListMine` (`GET /emojis`), `Delete` (`DELETE /servers/:id/emojis/:emojiId`), `ServeFile` (`GET /emojis/:emojiId/file?token=` — só membro do servidor do emoji).
- `routes.go`: `POST /servers/:id/emojis`, as rotas acima e `GET /emojis/base`.
- Testes (`emoji_test.go`, mocks como em `sticker_test.go`): nome inválido 400, sem permissão 403, servidor cheio 409, nome repetido 409, >256 KB 413, AVIF aceito, texto 415, sucesso 201 + broadcast; `ServeFile` de não membro 404; `Delete` por terceiro sem `MANAGE_EXPRESSIONS` 403.
- [ ] Testes primeiro, falhando; implementar; `go test ./internal/emoji`. Commit `feat(emojis): emojis personalizados por servidor no backend`.

### Task 5: pack base — proxy do emojibase

**Files:** `backend/internal/emoji/base.go`, `base_test.go`.

```go
// BaseEmoji: um emoji do pack base, já enxuto para o app.
type BaseEmoji struct {
	Emoji    string   `json:"emoji"`
	Label    string   `json:"label"`
	Keywords []string `json:"keywords,omitempty"`
	Group    int      `json:"group"`
}
type BaseGroup struct{ ID int `json:"id"`; Name string `json:"name"` }
type BasePack struct{ Groups []BaseGroup `json:"groups"`; Emojis []BaseEmoji `json:"emojis"` }
```

- `BaseService{baseURL, client, mu, body []byte, etag string}`; `Payload(ctx)` (singleflight) busca `compact.json` e `messages.json`, descarta grupo 2 (`component`) e itens sem `group`, ordena por `order`, serializa uma vez e guarda bytes+ETag (sem TTL). Handler responde 304 para `If-None-Match`. Erro → handler responde 502 e o app cai no pack local.
- Testes com `httptest.Server` servindo JSON mínimo: filtra componentes, ordena, segunda chamada não bate no servidor (contador), erro do upstream vira erro.
- [ ] Commit `feat(emojis): pack base vindo do emojibase`.

### Task 6: wiring

- [ ] `cmd/wire_emojis.go`: `func (a *app) wireEmojis()` cria store `uploads/emojis`, repo, handler, `NewBaseService(defaultBaseURL)` e registra `emoji.Routes`. `wire_chat.go` chama `a.wireEmojis()`. `go build ./... && go vet ./...`. Commit `feat(emojis): liga as rotas de emoji`.

### Task 7: app — tokens e pack base (lógica pura)

`features/emojis/lib/emojiToken.ts`:

```ts
export const EMOJI_NAME_RE = /^[A-Za-z0-9_]{2,32}$/
export const isValidEmojiName = (n: string): boolean => EMOJI_NAME_RE.test(n)
export const messageToken = (e: { id: string; name: string }): string => `<:${e.name}:${e.id}>`
export const reactionToken = (id: string): string => `<:${id}>`
const UUID = '[0-9a-fA-F-]{36}'
const REACTION_RE = new RegExp(`^<:(${UUID})>$`)
export const reactionEmojiId = (emoji: string): string | null => REACTION_RE.exec(emoji)?.[1] ?? null
export interface EmojiPart { text: string; emoji?: { id: string; name: string } }
/** Separa `<:nome:id>` do resto do texto (linear: um único regex global). */
export function splitCustomEmojis(text: string): EmojiPart[]
```

`features/emojis/lib/baseEmojis.ts`: `basePackToCategories(pack): EmoteCategory[]` (categoria "Frequentes" local primeiro, depois grupos do pack) e `filterCategories(categories, query)` (mesma regra de `filterEmoteCategories`).
- [ ] Testes primeiro (`emojiToken.test.ts`, `baseEmojis.test.ts`). Commit `feat(emojis): tokens de emoji personalizado e pack base no app`.

### Task 8: app — api + store + ws

- `api/emojis.ts`: `fetchMyEmojis(): Promise<ServerEmojis[]>`, `fetchBasePack(): Promise<BasePack>`, `uploadServerEmoji(serverId, name, file)`, `deleteServerEmoji(serverId, id)`, `emojiFileUrl(id, token)` — upload copiado de `chat/api/stickers.ts`.
- `store/emojiStore.ts`: `groups: ServerEmojis[]`, `byId: Record<string, CustomEmoji>`, `base: EmoteCategory[] | null`, `ensureLoaded()` (uma vez por sessão, idempotente), `ensureBase()` (falha → `EMOTE_CATEGORIES`), `upload`, `remove`, `handleWsEvent` (`emoji:created`/`emoji:deleted`). Selectors com referência estável (ver nota do `stickerStore`).
- `chat/store/wsEvents/dispatch.ts`: encaminha os eventos `emoji:*` ao `emojiStore`.
- [ ] Testes do store (mock da api) primeiro. Commit `feat(emojis): store de emojis personalizados`.

### Task 9: app — exibição no texto e nas reações

- `linkify.ts` `messageParts`: parte de texto passa por `splitCustomEmojis` antes de `splitMentions`; `RichPart` ganha `emoji?`.
- `components/CustomEmoji.tsx`: `<img>` 22 px inline (`h-[1.375em]` p/ escalar), 48 px quando a mensagem é só emojis (`jumbo`), `alt=":nome:"`; sem o id no `byId` (não membro) → texto `:nome:`.
- `components/ReactionEmoji.tsx`: `reactionEmojiId(emoji)` → `CustomEmoji` 20 px, senão o próprio texto; usado em `ReactionChips.tsx:66` e no rótulo/tooltip.
- [ ] Testes SSR (`renderToStaticMarkup`, store mockado): mensagem com token vira `<img>`; não membro vê `:nome:`; reação `<:id>` vira img. Commit `feat(emojis): emojis personalizados nas mensagens e reações`.

### Task 10: app — seletor e upload

- `hooks/usePickerDismiss.ts` (extraído do `UnifiedMediaPickerPopover` para baixar o CRAP 20 do `handleMouseDown`), com teste.
- `components/CustomEmojiSections.tsx`: uma seção por servidor (ícone + nome), grade 6 colunas (`max-md` auto-fill 44 px como o seletor de reação), contador e "Novo emoji" só no servidor aberto e com `ADD_EMOJIS`; lixeira para autor ou `MANAGE_EXPRESSIONS`.
- `EmojisTab.tsx` e `EmoteGrid` do `EmotePickerPopover.tsx`: mostram `CustomEmojiSections` (busca por nome) + categorias do `emojiStore.base`. No composer o clique insere `messageToken(e)`; na reação, `reactionToken(e.id)`.
- `components/EmojiUploadModal.tsx`: baseado no `StickerUploadModal`, valida nome e tamanho no app antes de enviar.
- `UnifiedMediaPickerPopover.tsx` abre o modal pela aba Emojis.
- [ ] Testes SSR das seções (com/sem permissão, busca) e do modal (validação). Conferir 360/768/1280 px num harness. Commit `feat(emojis): enviar e escolher emojis personalizados no seletor`.

### Task 11: fechamento

- [ ] `changelog/next.md` com o texto aprovado.
- [ ] `node scripts/affected-tests.mjs pr` (GO=…), CRAP depois, `web-design-guidelines` nos arquivos de UI, revisão em subagente, PR (com confirmação).
