# Eventos do servidor (Fase 1)

Primeira de quatro fases. Cada uma tem spec, plano e PR próprios:

1. **Eventos do servidor** (esta spec): criar, recorrência, presença e lembretes do bot.
2. Jogo associado ao evento.
3. Objetivos por dificuldade e bônus de XP na call do evento.
4. Evento global: aberto a todo o Salinha, com sala de voz e chat temporários
   (spec e ADR próprios; precisa de canal sem servidor e de acesso sem ser membro).

## Objetivo

Quem tem a permissão **Gerenciar eventos** cria eventos num servidor, com banner,
título, descrição, canal de voz, horário e recorrência opcional. Os membros
respondem **Vou** ou **Não vou**. Quem respondeu **Vou** recebe, na DM, avisos do
Salinha Bot nas antecedências escolhidas (no máximo 2) e sempre na hora de começar.

## Decisões

| Decisão | Escolha | Por quê |
|---|---|---|
| Quem cria, edita e cancela | Nova permissão `ManageEvents` (bit 31), fora do @everyone; dono e Administrador sempre | Não existe mais cargo Moderador padrão; cada servidor escolhe quais cargos recebem. |
| Recorrência | Presets: não repete, todo dia, toda semana, todo mês; fim opcional por data ou nº de vezes | Cobre o pedido sem RRULE nem dependência nova. Guarda só a regra e a ocorrência atual. |
| Mês sem o dia (ex.: dia 31) | Usa o último dia do mês | Regra previsível. |
| Presença em evento recorrente | Só vale para a ocorrência atual; a próxima começa sem respostas | Aviso só para quem confirmou aquele dia. |
| Respostas | Vou / Não vou (sem resposta = sem aviso) | Pedido original. "Talvez" fica fora. |
| Lembretes | Lista fixa: 1 dia, 1 h, 30, 15, 10, 5 min; **no máximo 2** por evento; padrão 10 e 5 min. Na hora de começar: sempre | Validação simples e textos iguais para todos. |
| Entrega | DM do Salinha Bot (`GetOrCreateBotDM` + `CreateConversationMessage`) | Caminho que o bot já usa nas propostas; o push de DM existente cobre quem está fora do app. |
| Local | Canal de voz do servidor, obrigatório | A Fase 3 precisa saber qual call é a do evento. |
| Agendamento | Ticker de ~30 s sobre a tabela `event_reminders` com `FOR UPDATE SKIP LOCKED` | Mesmo padrão do aniversário, sobrevive a restart, sem dependência nova. Alternativas descartadas: timers em memória (perdem aviso, estado duplicado) e River (dependência com schema próprio, pesado para ~3 avisos). Sem ADR, pois segue o padrão do repo. |
| Banner | Upload próprio, pasta `event-media` (fora dos anexos do chat), até 10 MB, imagem estática, exibido em 16:9 | Mesmo cuidado de `ProfileMediaDir`: a limpeza de anexos não pode apagá-lo. |
| Escopo no modelo | Coluna `scope` (`server`; a Fase 4 acrescenta `global`) | Evita migration quebrada depois. Nesta fase só existe `server`. |

## Arquitetura

### Permissão
`ManageEvents = 1 << 31` em `backend/internal/permission/perms.go`. Vale no servidor
todo (sem sobrescrita por canal). Atualizar `docs/CARGOS.md`,
`permission/testdata/vectors.json` (backend e app rodam os mesmos casos) e
`frontend/src/renderer/src/features/servers/lib/permissions.ts`. Ver os eventos e
responder só exige ser membro.

### Backend: `backend/internal/event/`
`model.go`, `repository.go`, `service.go`, `handler.go`, `routes.go`,
`recurrence.go` (próxima ocorrência, funções puras), `reminders.go` (ticker),
`texts.go` (textos do bot). Ligação em `cmd/wire_events.go`. Não mexe em `call`,
`message` nem em god stores.

### Migration `000176_create_server_events`
- `server_events`: `id`, `server_id`, `channel_id` (voz), `scope`, `title`,
  `description`, `banner_url`, `starts_at`, `next_start_at`, `recurrence`
  (`none|daily|weekly|monthly`), `recurrence_until`, `recurrence_count`,
  `occurrences_done`, `reminder_offsets` (0 a 2 valores da lista fixa),
  `created_by`, `canceled_at`, `created_at`, `updated_at`.
- `event_rsvps`: (`event_id`, `user_id`, `occurrence_start`) como chave, `going`.
- `event_reminders`: `event_id`, `occurrence_start`, `offset_minutes` (0 = na hora),
  `due_at`, `sent_at`; índice parcial em `due_at` onde `sent_at IS NULL`.
- Remoção em cascata com servidor, canal (cancela o evento) e membro (some a resposta).

### Frontend: `frontend/src/renderer/src/features/events/`
`components/` (`EventsPanel`, `EventCard`, `EventForm`, `ReminderPicker`),
`store/eventsStore.ts` (Zustand só dos eventos), `lib/` (`recurrence.ts`,
`reminders.ts`, `api.ts`). Botão "Eventos" na barra do servidor; "Criar evento" só
com `ManageEvents`.

## Fluxos

### Criar e editar
1. `POST /servers/:id/events` valida permissão, título (até 100 caracteres), descrição
   (até 1000), início no futuro, canal de voz do servidor e até 2 antecedências da lista.
2. Grava o evento e cria as linhas de `event_reminders` da ocorrência atual na mesma
   transação; emite `event:create` em `server:<id>`.
3. `PATCH` que muda horário ou antecedências recalcula, na mesma transação, as linhas
   pendentes. `DELETE` marca `canceled_at`, apaga as linhas pendentes e emite `event:delete`.

### Presença
`PUT /servers/:id/events/:eventId/rsvp` com `{going}` faz upsert para a ocorrência
atual; `DELETE` remove a resposta. `GET …/rsvps` lista quem vai.

### Lembretes
1. A cada ~30 s o ticker lê as linhas com `due_at <= agora` e `sent_at IS NULL`
   (`SKIP LOCKED`, `LIMIT` por rodada).
2. Para cada linha, busca quem respondeu Vou na ocorrência e manda a DM. Falha em uma
   pessoa não interrompe as outras e vai para o log; a linha fecha ao fim da rodada.
3. Aviso de antecedência vencido há mais de 10 min (servidor ficou fora do ar) é
   descartado; o "começou" ainda sai até 1 h depois do início.
4. Terminada a ocorrência (início + 3 h), o ticker avança `next_start_at`, soma
   `occurrences_done`, cria as linhas da seguinte e, se acabou o fim da recorrência ou o
   evento não repete, ele sai da lista (encerrado).

### Erros
Com `code`: `missing_permission`, `event_in_past`, `invalid_reminder`,
`too_many_reminders`, `invalid_channel`, `event_not_found`. Canal de voz apagado
cancela o evento. Quem perde o cargo ou sai continua tendo o evento no servidor; quem
tem `ManageEvents` edita.

### API

| Rota | Quem |
|---|---|
| `GET /servers/:id/events` | membro (próximas ocorrências, contagem de "vou", minha resposta) |
| `POST /servers/:id/events` | Gerenciar eventos |
| `PATCH`/`DELETE /servers/:id/events/:eventId` | Gerenciar eventos |
| `PUT`/`DELETE …/events/:eventId/rsvp` | membro |
| `GET …/events/:eventId/rsvps` | membro |

Tempo real: `event:create|update|delete` na sala `server:<id>`.

## Textos aprovados

DM do Salinha Bot (aprovados em 2026-10-30):

- Antecedência: `🔔 O evento "{título}" começa em {N} minutos em #{canal}, no servidor {servidor}.`
  ({N} minutos vira "1 hora" ou "1 dia" nessas antecedências.)
- Começou: `📅 O evento "{título}" está começando agora em #{canal}, no servidor {servidor}.`

Os demais textos de UI (botões, rótulos, mensagens de erro) seguem o vocabulário do app
e passam por aprovação no PR, conforme o AGENTS.md.

## Responsivo (360 / 768 / 1280 px)

- 360 px: painel em tela cheia; cards em coluna única, banner 16:9 em cima; botões
  Vou / Não vou com 44 px de altura; formulário como folha de baixo para cima, rolagem
  interna e "Salvar" fixo no rodapé.
- 768 px: lista numa coluna, largura máxima de 640 px.
- 1280 px: lista à esquerda, detalhe (quem vai, descrição completa) à direita.
- Teclado: tudo por Tab; Esc fecha o formulário e devolve o foco ao botão que o abriu.
- Toque: nenhuma ação só no hover.

## Testes

- Go: próxima ocorrência (diária, semanal, mensal em mês curto, fim por data e por
  contagem); validações (máximo 2 antecedências, início no passado, canal de outro
  servidor); permissão negada e permitida; ticker (só quem disse Vou, idempotente,
  descarta aviso velho, uma DM com falha não bloqueia as outras); repositório contra
  Postgres de teste; vetores de permissão.
- Frontend (Vitest): `recurrence.ts`, `reminders.ts`, o store e o formulário (limite
  de 2, botão oculto sem permissão).
- CRAP ≤ 15 em tudo que for tocado; o ticker e a recorrência ficam em funções pequenas.

## Fora de escopo

App mobile, jogo associado (Fase 2), objetivos e XP (Fase 3), evento global (Fase 4),
resposta "talvez", exportar para calendário, banner animado.

## Verificação de ponta a ponta

1. Com um cargo com Gerenciar eventos, criar um evento semanal daqui a ~12 min, com
   antecedências de 10 e 5 min, num canal de voz. Sem o cargo, o botão "Criar evento"
   não aparece e o `POST` volta `missing_permission`.
2. Com duas contas: uma responde Vou, a outra Não vou. A contagem muda em tempo real
   na outra aba.
3. Na DM do Salinha Bot, só a conta do Vou recebe 🔔 aos 10 e aos 5 min e 📅 na hora;
   reiniciar o backend entre os avisos não duplica nem perde nenhum.
4. Passada a ocorrência, o evento mostra a semana seguinte e as respostas voltam zeradas.
5. Editar o horário recalcula os avisos; cancelar o evento cancela os avisos pendentes.
6. 360 / 768 / 1280 px: painel, cartão e formulário sem rolagem horizontal, alvos de
   toque ≥ 44 px, uso completo só com teclado.
7. `node scripts/affected-tests.mjs pr` verde.
