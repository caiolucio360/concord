# 0037. Objetivos do evento: tempo contado em memória e pagamento em transação única

- Status: proposto
- Data: 2026-10-31
- Complementa: [0016](0016-nivel-do-servidor.md) (mesmo molde de contar tempo e mesmo teto diário no XP do servidor)

## Contexto

Fase 3 dos eventos (spec: `docs/superpowers/specs/2026-10-31-eventos-objetivos-xp-design.md`):
o evento tem até 3 objetivos com dificuldade ("ficar N min na sala" ou "jogar o jogo do evento
por N min"), e quem confirmou presença e cumpre dentro da sala ganha XP pessoal e XP do
servidor. Forças:

- **Pagar uma vez só.** Dois ticks, dois servidores ou um reinício não podem pagar o mesmo
  objetivo duas vezes nem perder o pagamento.
- **Dois XPs com regras diferentes.** O pessoal (`user_levels`) não tem teto diário; o do
  servidor passa por `server_level_add` (conta real e teto diário por fonte).
- **Não existe histórico de minutos em call no banco**: o tempo só existe em memória e é
  gravado já somado (ADR 0016), então não dá para calcular o progresso depois por consulta.
- **A atividade do jogo vem do cliente** e é falsificável (as Quests do Discord têm o mesmo
  problema), então a defesa tem que estar no servidor.
- **Regra 2 do repo**: `level`, `serverlevel`, `event` e `call/service.go` não podem engordar
  com uma responsabilidade nova.

## Opções consideradas

1. **Estender o tick do `level` e do `serverlevel`** para conhecer salas de evento e objetivos.
   Menos arquivos, mas espalha a regra do evento em dois pacotes que já têm outra
   responsabilidade.
2. **Contar por consulta ao banco.** Inviável: não há histórico de minutos em call.
3. **Pacote próprio (`internal/eventobjective`)**, com tracker em memória no molde do
   `serverlevel/tracker.go`, progresso gravado por (objetivo, pessoa, ocorrência) e pagamento
   idempotente numa transação.

Padrões de mercado consultados: quest com uma linha de progresso por pessoa, objetivo e
período, e recompensa só depois de concluir, com chave idempotente e conclusão atômica
(Gamend.Quests, Neroquests, o exemplo de claim com script Lua no Redis). A diferença para eles é
que aqui o "período" é a ocorrência do evento e o claim é um `UPDATE ... WHERE completed_at IS
NULL RETURNING`, o mesmo que o `ClaimDue` dos avisos usa.

## Decisão

Opção 3.

- **Contagem**: a cada 10 s o serviço lê `call.CallSnapshots()` (ganha `ChannelID`) e soma o
  tempo de quem tem Vou, é conta real, está em `Voice` e fora de `Away` na sala do evento em
  andamento; no objetivo `game`, também exige `Hub.GameName` igual ao jogo do evento. Minutos
  inteiros são gravados em `event_objective_progress`, com a ocorrência na chave (a ocorrência
  nova começa do zero sem limpeza).
- **Pagamento**: uma transação que (1) marca `completed_at` onde ainda é nulo, (2) aplica o teto
  pessoal de 6.000 XP/dia em `event_xp_daily`, (3) soma o XP pessoal e (4) chama
  `server_level_add(..., 'evento', xp)` (teto de 300/dia, fonte nova). Falhou em qualquer etapa,
  nada vale e o próximo tick tenta de novo. Depois do commit, publica os avisos.
- **Valores**: Fácil 1.000 / Médio 3.000 / Difícil 6.000 de XP pessoal; servidor 5%.
- **Falsificação da atividade**: o jogo detectado só vale dentro da sala, num minuto elegível do
  XP de voz, por conta real e abaixo dos tetos; o pior caso por pessoa é 6.000 XP pessoais e 300
  do servidor por dia.

## Consequências

- Nenhum dos pacotes existentes ganha regra de evento; só pequenas pontas aditivas
  (`CallSnapshot.ChannelID`, `Hub.GameName`, XP de bônus em transação, fonte `evento`).
- Até 1 minuto de progresso se perde num reinício que não grave a tempo (como o ADR 0016).
- O teto pessoal de eventos é novo e só vale para o bônus de evento; o XP de voz continua sem
  teto diário.
- A atividade do jogo continua confiável só até onde o cliente é: o teto limita o dano, não
  impede.
- Sem dependência nova.

## Fontes

- Gamend.Quests (progresso por usuário/missão/período, recompensa idempotente): https://gamend-core.hexdocs.pm/1.0.1216/Gamend.Quests.md
- Neroquests, objetivos recontados em vez de incrementados: https://github.com/Neroland/neroquests/wiki/Objectives
- Claim atômico de missão diária (Redis): https://oneuptime.com/blog/post/2026-03-31-redis-daily-quest-system/view
- Discord Quests (jogar N minutos depende do app desktop): https://support.discord.com/hc/en-us/articles/22225719947543
- Padrão do repo: `serverlevel/tracker.go` e `ClaimDue` de `event/repository_schedule.go`.
