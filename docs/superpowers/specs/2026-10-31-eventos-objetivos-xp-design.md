# Objetivos e XP do evento (Fase 3)

Terceira de quatro fases dos eventos do servidor. A Fase 1 (eventos, presença, avisos do bot, sala
própria e permissões por cargo, #462) já está na `develop`; a Fase 2 (jogo associado, #470)
**precisa entrar antes**, porque o objetivo "Jogar o jogo do evento" usa o `game_name` dela.
Specs: [Fase 1](2026-10-30-eventos-do-servidor-design.md) e
[Fase 2](2026-10-30-eventos-jogo-associado-design.md); guia: [docs/EVENTOS.md](../../EVENTOS.md);
decisão técnica: [ADR 0037](../../adr/0037-objetivos-do-evento-pagos-em-transacao-unica.md).

## Objetivo

Quem pode criar ou editar eventos cadastra até **3 objetivos** no evento, cada um com **dificuldade**.
Quem confirmou presença (**Vou**) e cumpre o objetivo **dentro da sala do evento** ganha **XP**:
o pessoal (nível da pessoa) e uma parte para o nível do servidor. Quem não confirmou presença não
ganha nada, nem consegue entrar na sala.

## Decisões

| Decisão | Escolha | Por quê |
|---|---|---|
| Qual XP | **Os dois**: o pessoal (`user_levels`) e o do servidor (`serverlevel`, ADR 0016) | Pedido do usuário. |
| Tipos de objetivo | `time` ("Ficar N min na sala do evento") e `game` ("Jogar <jogo do evento> por N min") | Pedido do usuário: só verificação automática; nada de marcação manual. `game` só existe se o evento tem jogo (Fase 2). |
| Texto do objetivo | **Não há texto livre**: o título é gerado do tipo, da meta e do jogo | Nada do usuário para moderar ou escapar; as frases ficam em um lugar só. |
| Meta | 15, 30, 45, 60, 90 ou 120 min, sem passar da duração do evento | Lista fixa como a das durações e dos avisos. Meta maior que o evento nunca fecharia. |
| Quem cadastra | Quem tem criar ou editar o evento (Fase 1), no formulário do evento | Pedido do usuário. Sem ação nova de cargo. |
| Edição | Os objetivos **travam com o evento em andamento** (`event_running`), como horário e duração | Mudar a meta no meio mudaria o prêmio de quem já correu. |
| Jogo e objetivos | Salvar o evento **sem jogo** com um objetivo `game` (ou com meta maior que a duração nova) volta `invalid_objective`; trocar o jogo vale, porque o título do objetivo é gerado do jogo atual | A validação roda sobre o conjunto final do evento, não sobre cada campo. |
| Recorrência | Os objetivos valem para todas as ocorrências; **cada ocorrência zera o progresso** | A chave do progresso inclui o início da ocorrência, então não há limpeza. |
| Valores | Fácil 1.000 / Médio 3.000 / Difícil 6.000 de XP pessoal; servidor 5%: 50 / 150 / 300 | Pedido do usuário (Fácil começa em 1.000). |
| Pagamento | Uma vez por pessoa, por objetivo, por ocorrência. Mudar o Vou depois não desfaz | Simples e sem o objetivo "piscar". |
| Quem pontua | Tem **Vou** na ocorrência atual, é **conta real** (e-mail confirmado), está na **sala do evento** e está num **minuto elegível** do XP de voz (sem mute, sem surdez, mais alguém ouvindo, sem AFK) | Reaproveita as regras anti-farm do ADR 0016 e do XP de voz; fora da sala não há como cumprir. |
| Tempo | **Acumula**, não precisa ser seguido; só conta durante a ocorrência | Quem cai da call e volta não perde tudo. |
| Objetivo `game` | Além de tudo isso, a atividade detectada da pessoa tem que ser o jogo do evento (mesma comparação do selo "Jogando": sem acento, maiúsculas e espaços nas pontas) | Só funciona para quem usa o Electron no Windows; web e Android cumprem só os de tempo. A atividade vem do cliente e é falsificável: por isso só vale dentro da sala, num minuto elegível e sob os tetos. |
| Tetos | Pessoal: **6.000 XP por pessoa por dia** (dia de Brasília), somando todos os eventos e servidores. Servidor: fonte `evento` com **300 por pessoa por dia**, sem competir com o teto da voz | O XP pessoal não tem teto próprio; evento criado só para dar XP é o risco. O servidor reaproveita `server_level_add`. |
| Teto estourado | Paga só o que cabe (pode ser 0) e o objetivo conta como cumprido | Quem cumpriu não perde o objetivo; o farm não passa do teto. |
| Progresso | Barra de cada objetivo no detalhe, atualizada pelo tempo real; aviso ao cumprir | Sem DM do bot. |

## Arquitetura

Padrão e fontes na ADR 0037 (progresso por pessoa e período, pagamento idempotente em
transação). O molde de contar tempo é o do `serverlevel/tracker.go`.

### Backend

**`backend/internal/eventobjective/`** (pacote novo, ao lado de `event/`):

| Arquivo | Responsabilidade |
|---|---|
| `model.go` | `Objective`, `Kind` (`time`, `game`), `Difficulty` (`easy`, `medium`, `hard`), tabela de XP, metas, `MaxObjectives = 3`, erros (`ErrInvalidObjective`) |
| `validate.go` | valida a lista: até 3, tipo, dificuldade, meta na lista e ≤ duração, `game` só com jogo |
| `repository.go` | `event_objectives` (troca o conjunto do evento), progresso, leitura com `my_minutes` e `my_done` |
| `repository_pay.go` | transação do pagamento (conclusão, teto pessoal, XP pessoal, XP do servidor) |
| `tracker.go` | soma segundos em memória por (objetivo, pessoa), drena minutos inteiros; quem sai da sala perde o resto |
| `service.go` | ticker de 10 s: lê `call.CallSnapshots()`, acha as salas de eventos em andamento, calcula quem pontua e alimenta o tracker; a cada minuto grava e paga |
| `events.go` | evento de tempo real `event:objective` (`{server_id, event_id, objective_id, minutes, done, xp, capped}`) para a pessoa |

**Ligações que mudam fora do pacote** (pequenas, aditivas):
- `call/snapshot.go`: `CallSnapshot.ChannelID *string` (hoje só há o `CallID`).
- `platform/websocket/activity.go`: `Hub.GameName(userID) string` (só leitura do que já está em memória).
- `level/`: XP de bônus aceito dentro de uma transação (`AddBonusXP`, sem somar tempo de voz) e o aviso de nível (`level:update`, `level:up`) separado do `give`, para o pagamento reaproveitar.
- `serverlevel/sources.go`: fonte `evento` (e o rótulo no detalhamento do app); migration com o teto 300 em `server_level_cap`.
- `event/`: `Event.Objectives` e `Input.Objectives` no JSON; `service.go` guarda o conjunto por uma interface pequena do `eventobjective`; `sameSchedule` passa a comparar os objetivos (`event_running`); erro `invalid_objective` na tabela do handler. O `event` não ganha regra de objetivo.
- `cmd/wire_event_objectives.go`: liga tudo; sem dependência nova.

**Migrations** (os números seguem o próximo livre da `develop` quando a fase começar; hoje, 000183 e 000184):
- `event_objectives (id, event_id → server_events ON DELETE CASCADE, position, kind, difficulty, minutes)`.
- `event_objective_progress (objective_id, user_id, occurrence_at, minutes, completed_at, xp_paid, PK (objective_id, user_id, occurrence_at))`.
- `event_xp_daily (user_id, day, xp, PK (user_id, day))`, o teto pessoal.
- `server_level_cap`: `WHEN 'evento' THEN 300`.

### Frontend (`features/events/`)
- `lib/objectives.ts`: rótulos, lista de metas por duração, título gerado, porcentagem da barra e formatação do XP (puro, com teste); o XP de cada objetivo vem do servidor. `lib/objectiveEvents.ts` junta o aviso ao cumprir.
- `components/ObjectivesField.tsx` (formulário, até 3 linhas) e `ObjectiveRow.tsx`.
- `components/ObjectivesList.tsx` e `ObjectiveBar.tsx` (detalhe): título, XP, barra, "Cumprido".
- `api/events.ts`: tipos `Objective` / `ObjectiveInput`; `lib/eventForm.ts` valida e envia a lista.
- `store/eventsStore.ts`: aplica `event:objective` na lista; o aviso ao cumprir usa o toast que já existe.
- Nada vai para `chatStore`, `serverStore` nem `callStore`.

## Fluxo de dados

1. O organizador salva o evento com `objectives`; o `event` repassa o conjunto ao `eventobjective`.
2. A cada 10 s o `service` olha as chamadas ativas. Para cada sala de um evento em andamento
   (`ChannelID` = `voice_channel_id` do evento), considera quem está em `Voice`, fora de `Away`,
   com Vou na ocorrência atual e conta real. No objetivo `game`, exige também `Hub.GameName` igual
   ao `game_name` do evento.
3. O `tracker` soma o tempo. A cada minuto cheio, o progresso é gravado (`minutes` em
   `event_objective_progress`) e a pessoa recebe `event:objective` com a barra nova.
4. Ao bater a meta, uma **transação única** faz: marca `completed_at` (`UPDATE ... WHERE
   completed_at IS NULL RETURNING`, só um tick ganha), aplica o teto pessoal em `event_xp_daily`,
   soma o XP pessoal e chama `server_level_add(..., 'evento', xp)`. Depois do commit, publica
   `level:update` / `level:up` e `event:objective` com `done` e o XP pago.
5. Se a transação falhar, nada foi pago nem marcado e o próximo tick tenta de novo.
6. Reinício do backend: até 1 minuto não gravado se perde; o progresso gravado e o pagamento
   continuam.

## Erros

`invalid_objective` (400) para lista inválida; `event_running` (409) se mexer nos objetivos com o
evento em andamento. Falha de pagamento não vira erro para a pessoa: é logada e repetida.

## Textos aprovados

| Onde | Texto |
|---|---|
| Formulário, título | Objetivos (opcional) |
| Formulário, ajuda | Quem confirmar presença e cumprir o objetivo na sala do evento ganha XP. |
| Botão | Adicionar objetivo (some no terceiro) |
| Campos | Tipo, Dificuldade, Meta |
| Tipos | Ficar na sala · Jogar o jogo do evento |
| Tipo "jogar" sem jogo no evento | desativado, com a dica "Escolha um jogo para o evento." |
| Dica do tipo "jogar" | Conta só para quem usa o app para Windows. |
| Dificuldades | Fácil · Médio · Difícil |
| Metas | 15 min · 30 min · 45 min · 60 min · 90 min · 120 min |
| Remover (leitor de tela) | Remover objetivo |
| Detalhe, título | Objetivos |
| Detalhe, cada objetivo | "Ficar 30 min na sala do evento" ou "Jogar Minecraft por 30 min"; "+1.000 XP"; "12 de 30 min"; ao concluir, "Cumprido" |
| Detalhe, sem Vou | Confirme presença para ganhar XP com os objetivos. |
| Aviso ao cumprir | Objetivo cumprido: Ficar 30 min na sala do evento. +1.000 XP |
| Aviso, teto estourado | Objetivo cumprido: Ficar 30 min na sala do evento. +400 XP (limite diário de XP de eventos) |

Nenhuma DM do Salinha Bot muda. A nota de changelog não precisa de aprovação (AGENTS.md).

## Responsivo (360, 768 e 1280 px)

No formulário, cada objetivo é uma coluna no celular e uma linha de três campos de 768 px em
diante; alvos de toque ≥ 40 px; remover é um `IconButton` com nome acessível. No detalhe, título e
XP ficam em linhas separadas, com `min-w-0` e `truncate` no nome do jogo, e a barra ocupa a
largura toda. Ícones de `shared/ui/icons`, `Button` e tokens de cor e texto; `focus-ring` em tudo
que recebe foco.

## Testes

Primeiro os que falham, só do que importa.
- **Backend, puros:** validação (limite de 3, metas, `game` sem jogo, meta maior que a duração); tabela de XP; tracker (minuto elegível, quem sai perde o resto); corte pelo teto.
- **Backend, com Postgres:** paga uma vez mesmo com dois ticks juntos; ocorrência nova zera o progresso; quem não disse Vou não pontua; conta não real não pontua; AFK, mute e call sozinha não contam; `game` com outro jogo não conta; os tetos (6.000 pessoal e 300 servidor) cortam e o objetivo conta como cumprido; a transação desfaz tudo se uma etapa falhar; cancelar o evento apaga objetivos e progresso.
- **Frontend:** formulário (adicionar, remover, limite, dica sem jogo), detalhe (barra, "Cumprido", mensagem sem Vou), `event:objective` na store, `lib/objectives.ts`.
- CRAP ≤ 15 em toda função tocada; nenhum arquivo tocado acima de 400 linhas cresce.

## Fora de escopo

Marcação manual, objetivos com texto livre ou que não sejam de tempo, ranking de eventos, DMs do
bot sobre objetivos, retroativo, evento global (Fase 4) e o app Android (continua sem a seção).

## Verificação de ponta a ponta

Com duas contas reais e o `livekit-server.exe` nativo (Docker no Windows não passa mídia):
1. Crie um evento de 30 min com um objetivo Fácil de 15 min e confirme presença com as duas contas.
2. Na hora do início, as duas entram na sala e falam; a barra anda a cada minuto.
3. Aos 15 min o aviso aparece, o XP pessoal sobe 1.000 e o do servidor 50, e o objetivo mostra "Cumprido".
4. Uma terceira conta sem Vou não entra na sala e não ganha nada; uma quarta conta nova (sem e-mail confirmado) na sala também não.
5. Saia e entre na sala: o progresso não zera e o objetivo não paga de novo.
6. Crie um segundo evento no mesmo dia com objetivos Difíceis até passar de 6.000 XP: o aviso mostra o limite diário.
7. Evento recorrente: na ocorrência seguinte as barras voltam do zero.

## Ordem de entrega

A Fase 2 (#470) precisa estar na `develop` primeiro. Esta branch parte da `feat/eventos-jogo`; se o
#470 já tiver entrado quando a fase começar, rebaseie na `develop`. Confira o próximo número de
migration livre antes de criar as de objetivos.
