# Eventos do servidor

Quem tem **Gerenciar eventos** marca um evento no servidor (banner, título,
descrição, canal de voz, horário e repetição). Os membros respondem **Vou** ou
**Não vou**, e quem foi de **Vou** recebe, na DM, avisos do Salinha Bot antes e
na hora de começar. Spec:
[2026-10-30-eventos-do-servidor-design.md](superpowers/specs/2026-10-30-eventos-do-servidor-design.md).

## Regras

- **Permissão**: `ManageEvents` (bit 14, o único livre abaixo de 2^31: o app faz
  bitwise em 32 bits, ver [CARGOS.md](CARGOS.md)). Fora do @everyone; dono e
  Administrador têm sempre. Ver e responder só exige ser membro.
- **Local**: um canal de voz do mesmo servidor, obrigatório. Se o canal for
  apagado, o evento some junto.
- **Repetição**: não repete, todo dia, toda semana ou todo mês, com fim opcional
  (data ou número de vezes). O mês sem o dia (ex.: 31) usa o último dia. Só a
  regra fica guardada; `next_start_at` é a ocorrência atual e `occurrences_done`
  o índice dela (`event/recurrence.go`).
- **Presença**: vale só para a ocorrência atual. Quando ela acaba, a próxima
  começa sem respostas.
- **Avisos**: até **2 antecedências** da lista (1 dia, 1 h, 30, 15, 10 e 5 min;
  padrão 10 e 5) e **sempre** o aviso na hora de começar.
- **Banner**: PNG, JPEG ou WEBP de até 10 MB, em `uploads/event-media/<id>`
  (fora da limpeza dos anexos do chat). O evento guarda só o `banner_id`; o app
  monta a URL com o token de mídia (`GET /event-banners/:bannerId?token=`).
  Banner enviado e nunca usado, ou trocado depois, fica no disco.

## Como os avisos saem

1. Ao criar ou editar, o service grava as linhas de `event_reminders`
   (`due_at` = início − antecedência; o "na hora" é `offset_minutes = 0`).
   Antecedência que já passou (evento criado em cima da hora) nem é gravada.
2. O ticker (`event/scheduler.go`, a cada ~30 s) reivindica os avisos vencidos
   num `UPDATE … RETURNING` com `FOR UPDATE SKIP LOCKED`: cada aviso sai uma vez,
   mesmo com mais de uma instância. Depois manda a DM do Salinha Bot a quem
   disse Vou. Falha com uma pessoa não barra as outras.
3. Aviso de antecedência atrasado mais de 10 min (o servidor ficou fora do ar) é
   descartado; o "começou" ainda sai até 1 h depois do início.
4. Com a ocorrência encerrada (3 h depois do início), o ticker avança o evento
   para a próxima e cria os avisos dela; sem próxima, o evento é encerrado.

Os textos das DMs estão em `event/texts.go`.

## API

| Rota | Quem |
|---|---|
| `GET /servers/:id/events` | membro (próximas ocorrências, contagem de "vou", minha resposta) |
| `POST /servers/:id/events` | Gerenciar eventos |
| `PATCH` / `DELETE /servers/:id/events/:eventId` | Gerenciar eventos |
| `POST /servers/:id/events/banner` | Gerenciar eventos (multipart, devolve `banner_id`) |
| `PUT` / `DELETE …/events/:eventId/rsvp` | membro (`{"going": true\|false}` no PUT) |
| `GET …/events/:eventId/rsvps` | membro (quem vai) |
| `GET /event-banners/:bannerId?token=` | membro do servidor do evento |

Erros vêm com `code`: `missing_permission`, `not_member`, `event_not_found`,
`event_ended`, `event_in_past`, `invalid_title`, `invalid_description`,
`invalid_recurrence`, `invalid_reminder`, `too_many_reminders`,
`invalid_channel`, `invalid_banner`.

## Tempo real

`event:create`, `event:update`, `event:delete` e `event:rsvp` na sala `server:<id>`.
`delete` leva `{server_id, event_id}`; `rsvp` leva `{server_id, event_id,
going_count}` (quantos vão agora na ocorrência atual, sem dizer quem).

## Fora de escopo (por enquanto)

Jogo associado ao evento, objetivos e XP na call (fases 2 e 3), evento global
aberto a todo o Salinha (fase 4), resposta "talvez" e app mobile.
