# Observabilidade das lives

O que existe para saber como as lives e calls estão de fato, e onde agir.
Decisão e alternativas: [ADR 0029](adr/0029-observabilidade-das-lives.md).
Como ligar na VPS: [HOSPEDAGEM.md](HOSPEDAGEM.md#métricas-do-livekit-observabilidade-das-lives).

## O que é coletado

| Fonte | Tabela | De quanto em quanto | O quê |
|---|---|---|---|
| LiveKit (`/metrics`, Prometheus em 127.0.0.1) + `/proc` da VPS | `livekit_metrics` | 1 min | banda entrando/saindo, retransmissões, perda na subida (quem publica → SFU) e na descida (SFU → quem assiste), NACK, PLI, RTT, jitter, nota de qualidade, salas, participantes, tracks, CPU e memória do LiveKit e da VPS |
| App (quem transmite) | `live_sessions` (`transmite`) + `live_samples` | 20 s | codec, placa ou processador, resolução e fps reais × escolhidos, Mbps, `qualityLimitationReason`, degrau do controlador e trocas, camadas, reserva, quadros-chave, PLI, NACK, UDP/TCP/TURN |
| App (quem assiste) | `live_sessions` (`assiste`) + `live_samples` | 20 s | codec, decodificador na placa ou no processador, resolução e fps recebidos, perda, jitter, congelamentos, quadros descartados, pausa do servidor, UDP/TCP/TURN |
| App (voz) | `live_sessions` (`call`) + `live_samples` | 60 s | RTT, perda e jitter vistos pelo servidor, UDP/TCP/TURN |
| App e servidor | `live_events` | quando acontece | início, fim, qualidade caiu/voltou, reserva ligada, codificador/decodificador no processador, codec trocou, congelamento longo (≥ 2 s em 20 s), pausada pelo servidor |

Contexto de cada sessão: SO, versão do app, web/desktop, placa de vídeo (renderer
do WebGL), núcleos do processador e tipo de rede (quando o navegador conta).
Nada do que se fala, escreve ou mostra. Tudo fica 14 dias (o backend apaga de
hora em hora). Visitante sem conta não manda.

Nos contadores das amostras (`freezes`, `freeze_ms`, `frames_dropped`,
`key_frames`, `pli`, `nack`, `step_changes`) o valor é a diferença no intervalo
`seconds`; o resto é o valor no momento. A primeira amostra de cada sessão é a
base (contadores zerados, `seconds = 0`).

## Painel

`/observabilidade` no app (no navegador: `https://<app>/observabilidade`), só
para quem está em `dev_badge_users` ([como conceder](HOSPEDAGEM.md#badge-fundador-devs)).
Não tem link no app. Mostra, para 24 h, 3, 7 ou 14 dias:

- **Servidor**: picos de saída, pessoas, CPU da VPS e perda média na descida;
  gráficos de banda (entrada/saída) e de CPU (VPS e LiveKit).
- **Lives recentes**: quem, quando, duração, codec, % na placa, % abaixo do
  alvo (fps < 80% do escolhido ou degrau abaixo do escolhido), limitação por
  CPU/banda, espectadores, congelamentos por minuto e % decodificando no
  processador entre os espectadores.
- **Piores sessões e por quê**: pontuação (abaixo do alvo, congelamentos,
  pausa, perda, CPU/banda, processador) e os motivos prováveis.
- **Distribuição** por sistema, placa de vídeo, codec e conexão.
- **Eventos recentes.**

O mesmo JSON: `GET /api/obs/lives?days=7` (token de um dev).

## Consultas prontas (psql)

Na VPS: `psql "$DATABASE_URL"`.

**Banda e CPU por hora (últimas 24 h):**
```sql
SELECT date_trunc('hour', minute) AS hora,
       round((sum(bytes_out) * 8 / 1e6 / nullif(sum(seconds), 0))::numeric, 1) AS mbps_saida,
       round((sum(bytes_in) * 8 / 1e6 / nullif(sum(seconds), 0))::numeric, 1) AS mbps_entrada,
       round(max(host_cpu_pct)::numeric) AS cpu_vps_max,
       round(avg(livekit_cpu_pct)::numeric) AS cpu_livekit_media,
       max(participants) AS pessoas_max
FROM livekit_metrics
WHERE minute > now() - interval '24 hours'
GROUP BY 1 ORDER BY 1;
```

**A banda acaba antes da CPU?** (minutos mais carregados)
```sql
SELECT minute, round((bytes_out * 8 / 1e6 / nullif(seconds, 0))::numeric, 1) AS mbps_saida,
       round(host_cpu_pct::numeric) AS cpu_vps, round(livekit_cpu_pct::numeric) AS cpu_livekit,
       participants, video_tracks_out
FROM livekit_metrics WHERE up
ORDER BY bytes_out DESC LIMIT 20;
```

**Perda: subida (quem transmite) × descida (quem assiste), por dia:**
```sql
SELECT date_trunc('day', minute) AS dia,
       round((100.0 * sum(packets_lost_in) / nullif(sum(packets_in) + sum(packets_lost_in), 0))::numeric, 2) AS perda_subida_pct,
       round((100.0 * sum(packets_lost_out) / nullif(sum(packets_out) + sum(packets_lost_out), 0))::numeric, 2) AS perda_descida_pct,
       sum(nack) AS nack, sum(pli) AS pli
FROM livekit_metrics WHERE up GROUP BY 1 ORDER BY 1;
```

**Lives recentes (quem transmitiu), com % abaixo do alvo e limitação:**
```sql
SELECT u.username, s.started_at, coalesce(s.ended_at, s.last_seen_at) - s.started_at AS duracao,
       mode() WITHIN GROUP (ORDER BY x.codec) AS codec,
       round(100 * avg(CASE WHEN x.hardware THEN 1.0 WHEN NOT x.hardware THEN 0.0 END)) AS na_placa_pct,
       round(100 * avg(CASE WHEN x.target_fps > 0 THEN
             CASE WHEN x.fps < 0.8 * x.target_fps OR x.step > 0 THEN 1.0 ELSE 0.0 END END)) AS abaixo_do_alvo_pct,
       round(100 * avg(CASE WHEN x.limitation = 'cpu' THEN 1.0 ELSE 0.0 END)) AS cpu_pct,
       round(100 * avg(CASE WHEN x.limitation = 'bandwidth' THEN 1.0 ELSE 0.0 END)) AS banda_pct,
       sum(x.step_changes) AS trocas_de_degrau, s.os, s.gpu
FROM live_sessions s JOIN users u ON u.id = s.user_id JOIN live_samples x ON x.session_id = s.id
WHERE s.kind = 'transmite'
GROUP BY s.id, u.username ORDER BY s.started_at DESC LIMIT 30;
```

**Quem assistiu cada live e como foi:**
```sql
SELECT t.username AS transmitiu, v.username AS assistiu, w.started_at,
       round((60.0 * sum(x.freezes) / nullif(sum(x.seconds), 0))::numeric, 2) AS congelamentos_min,
       round(avg(x.fps)::numeric) AS fps, round(avg(x.loss_pct)::numeric, 2) AS perda_pct,
       bool_or(NOT x.hardware) AS decodificou_no_processador,
       round(100 * avg(CASE WHEN x.paused THEN 1.0 ELSE 0.0 END)) AS pausada_pct,
       mode() WITHIN GROUP (ORDER BY x.transport) AS conexao
FROM live_sessions w
JOIN users v ON v.id = w.user_id JOIN users t ON t.id = w.streamer_id
JOIN live_samples x ON x.session_id = w.id
WHERE w.kind = 'assiste'
GROUP BY w.id, t.username, v.username ORDER BY w.started_at DESC LIMIT 50;
```

**Quantas conexões caem no TCP/TURN** (vale TURN/TLS na 443?):
```sql
SELECT transport, count(DISTINCT session_id) AS sessoes
FROM live_samples WHERE transport <> '' GROUP BY 1 ORDER BY 2 DESC;
```

**Quem decodifica/codifica no processador, por sistema e placa:**
```sql
SELECT s.kind, s.os, s.gpu, count(DISTINCT s.id) AS sessoes,
       round(100 * avg(CASE WHEN NOT x.hardware THEN 1.0 WHEN x.hardware THEN 0.0 END)) AS no_processador_pct
FROM live_sessions s JOIN live_samples x ON x.session_id = s.id
WHERE s.kind IN ('transmite', 'assiste')
GROUP BY 1, 2, 3 ORDER BY sessoes DESC;
```

**Distribuição por codec (o que as placas escolhem de fato):**
```sql
SELECT codec, count(DISTINCT session_id) AS sessoes, round(avg(fps)::numeric) AS fps,
       round(avg(bitrate_kbps)::numeric) AS kbps
FROM live_samples WHERE codec <> '' GROUP BY 1 ORDER BY 2 DESC;
```

**Eventos das últimas 24 h, por tipo:**
```sql
SELECT type, count(*) FROM live_events WHERE at > now() - interval '24 hours' GROUP BY 1 ORDER BY 2 DESC;
```

**Linha do tempo de uma live** (troque o id):
```sql
SELECT at, fps, target_fps, height, bitrate_kbps, limitation, step, backup, layers, transport
FROM live_samples WHERE session_id = '<id>' ORDER BY at;
SELECT at, type, detail FROM live_events WHERE session_id = '<id>' ORDER BY at;
```

## Onde agir (como ler)

| Sinal | Provável causa | O que fazer |
|---|---|---|
| `limitation = cpu` alto em quem transmite, `na_placa_pct` baixo | encoder por software | conferir placa/driver; codec que a placa codifica |
| `limitation = bandwidth` alto | upload de quem transmite | preset menor ou camada de 720p |
| perda na **subida** alta (`packets_lost_in`) | rede de quem transmite | idem; ver `transport` (TCP piora) |
| perda na **descida** alta, `paused` em quem assiste | rede de quem assiste / banda da VPS | camada de 720p (simulcast); conferir `mbps_saida` perto do limite da VPS |
| `decodificou_no_processador` em quem tem congelamentos | decodificador por software | driver (ex.: nvidia-vaapi-driver no Linux), codec mais leve |
| `backup` alto | alguém sem o codec principal | ver quem (SO/placa) e a ordem de codecs |
| muitas sessões `tcp`/`relay` | rede bloqueando UDP | TURN/TLS na 443 (relatório da investigação §3.8) |
| CPU da VPS > 80% ou `mbps_saida` no teto do plano | VPS no limite | VPS maior, teto de bitrate, simulcast |
