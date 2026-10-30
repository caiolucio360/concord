# 0028. Observar as lives pelo próprio backend: Prometheus do LiveKit e telemetria do app no Postgres

- Status: aceito
- Data: 2026-10-29
- Complementa: [0020](0020-qualidade-das-lives.md) (o controlador e os painéis da live mostram o agora; isto guarda o histórico)

## Contexto

As decisões sobre as lives (codec, simulcast, TURN, tamanho da VPS) eram
tomadas no escuro: o painel "Sua transmissão/Recebendo" mostra só o momento e
só para quem abre, e o servidor não tinha métrica nenhuma (relatório da
investigação, §3.6 e §3.9). O dono pediu informação completa para "saber onde
agir": banda e CPU do servidor no tempo, e, por live, quem, quanto tempo, codec,
quanto ficou abaixo do alvo, congelamentos, placa ou processador, por que
piorou.

Forças:

- **VPS pequena** (2 vCPU, ~4 GB) dividida com backend, Postgres, LiveKit,
  Caddy e o Maestro: nada pesado; sem Prometheus + Grafana se der para evitar.
- **Sem dependência nova** (go.mod, package.json).
- **Privacidade**: só números técnicos, nada do que se fala ou mostra.
- O grupo é pequeno (dezenas de pessoas): o volume cabe folgado no Postgres.
- Recriar o LiveKit derruba as calls: a mudança na configuração dele precisa
  ser uma só e aplicada à mão (`--infra`).

## Opções consideradas

**Servidor (LiveKit):**

1. **Prometheus + Grafana** (o caminho da doc do LiveKit). Prós: painéis
   prontos. Contras: dois serviços a mais (~300–500 MB de RAM), mais uma porta e
   login para cuidar; pesado para a VPS.
2. **VictoriaMetrics/Netdata num binário só.** Mais leve que o 1, mas ainda é
   um serviço a mais, com armazenamento e painel próprios fora do app.
3. **O backend lê o `/metrics` do LiveKit a cada minuto e grava uma linha no
   Postgres** (escolhida). Um GET local de dezenas de KB por minuto; 20 160
   linhas em 14 dias. O LiveKit não expõe UDP×TCP nem "track pausada por
   congestionamento" no Prometheus (lido no código da v1.13.10,
   `pkg/telemetry/prometheus`): isso vem da telemetria do app (abaixo).

**App (quem transmite e quem assiste):**

1. **Serviço externo** (Sentry/OpenTelemetry/callstats). Dependência nova e
   dado de usuário saindo para terceiros.
2. **Webhooks/analytics do LiveKit.** Os webhooks não trazem qualidade; o
   analytics é do LiveKit Cloud.
3. **O app resume o `getStats()` (W3C webrtc-stats) e manda ao backend**
   (escolhida): reaproveita a leitura que o painel da live já faz
   (`readActiveScreenStats`), um POST a cada 20 s com todas as sessões, tabelas
   próprias com retenção.

**Visão para o time:**

1. Grafana (descartado com o 1 acima).
2. Só endpoint JSON + consultas SQL no `psql`.
3. **Endpoint JSON só para devs + página no app** (`/observabilidade`) com as
   mesmas consultas, e o documento [OBSERVABILIDADE.md](../OBSERVABILIDADE.md)
   com o SQL para o que a página não mostra (escolhida). Dev = quem está em
   `dev_badge_users` (a mesma tabela do badge Fundador).

## Decisão

**LiveKit.** `prometheus.port` (padrão 6789, `LIVEKIT_PROMETHEUS_PORT`) no
`LIVEKIT_CONFIG`; o LiveKit escuta nos `bind_addresses` (127.0.0.1, medido).
`internal/liveobs` (coletor) + `internal/platform/promtext` (leitor do formato
de texto, sem dependência) + `internal/platform/hoststats` (`/proc/stat` e
`/proc/meminfo`). A cada minuto, a diferença entre duas coletas vira uma linha
em `livekit_metrics`: bytes e pacotes entrando/saindo, retransmissões, perda
na subida (quem publica → SFU) e na descida (SFU → quem assiste), NACK, PLI,
RTT e jitter médios, nota de qualidade média, salas/participantes/tracks (vídeo
à parte), CPU e memória do LiveKit (`process_*`) e da máquina. Contador menor
que o anterior = o LiveKit reiniciou e conta do zero. LiveKit fora: a linha sai
só com a máquina (`up = false`).

**Telemetria.** `POST /api/obs/telemetry` (login de conta; visitante não
manda), até 8 sessões por pedido, corpo ≤ 32 KB, 6 pedidos por minuto por
pessoa (o app manda 3). Cada sessão tem id gerado no app (UUID), tipo
(`transmite`, `assiste`, `call`), call, de quem é a live (`assiste`), contexto
(SO, versão, app web/desktop, GPU pelo WebGL, tipo de rede quando o navegador
conta) e uma amostra: codec, placa ou processador, resolução e fps reais ×
alvo, Mbps, `qualityLimitationReason`, degrau do controlador e trocas,
camadas, reserva, perda, jitter, RTT, congelamentos (quantos e quanto tempo),
quadros descartados, quadros-chave, PLI, NACK, UDP/TCP/TURN (par ICE
escolhido) e se o servidor pausou a live. Contadores vão como diferença no
intervalo. O servidor valida tudo (tipos fixos, números com teto, textos
cortados) e é dono da sessão quem a criou. Eventos em `live_events`: início e
fim (servidor), degrau caiu/subiu, reserva ligada, codificador/decodificador
caiu para o processador, congelamento longo (≥ 2 s no intervalo), pausada pelo
servidor (app). Calls sem live mandam uma amostra por minuto (RTT, perda,
jitter, transporte); lives, a cada 20 s.

**Retenção**: 14 dias para tudo, apagado de hora em hora pelo backend.

**Privacidade**: ligado por padrão, sem opção de desligar, com uma frase na
seção Privacidade das configurações. São números técnicos da conexão e do
vídeo, ligados à conta para saber de quem é o problema, guardados por 14 dias
e vistos só pelos devs; nada do que se fala, escreve ou mostra sai do app. Um
interruptor exigiria preferência nova e conferência no servidor por algo que
não expõe conteúdo; se o grupo pedir, é só não mandar no app.

## Consequências

- O deploy precisa de um `scripts/deploy-vps.sh --infra` (derruba as calls)
  para o LiveKit ganhar o Prometheus; até lá as linhas saem só com a máquina.
- Dá para responder com dado: a banda da VPS acaba antes da CPU? quem
  transmite está limitado por CPU ou banda? quantos assistem decodificando no
  processador? quantos caem no TCP (vale TURN/TLS na 443?)?
- Cada pessoa em live manda ~1 KB a cada 20 s; o backend faz 3–4 escritas
  por pedido. Volume esperado: dezenas de milhares de linhas em 14 dias.
- A página do painel é só leitura e não tem link no app: os devs abrem
  `/observabilidade` (no navegador, `https://<app>/observabilidade`).
- Migrations novas: 000172 (`livekit_metrics`) e 000173 (`live_sessions`,
  `live_samples`, `live_events`).

## Fontes

- LiveKit — Deployment / Prometheus (`prometheus.port`): https://docs.livekit.io/transport/self-hosting/deployment/
- LiveKit v1.13.10 `pkg/service/server.go` (Prometheus nos `bind_addresses`) e
  `pkg/telemetry/prometheus/{packets,rooms,quality,node}.go` (nomes e rótulos):
  https://github.com/livekit/livekit/tree/v1.13.10/pkg/telemetry/prometheus
- Prometheus — Exposition formats (texto): https://prometheus.io/docs/instrumenting/exposition_formats/
- W3C — Identifiers for WebRTC's Statistics API (`outbound-rtp`, `inbound-rtp`,
  `candidate-pair`, `qualityLimitationReason`, `freezeCount`): https://www.w3.org/TR/webrtc-stats/
- Linux `proc(5)` (`/proc/stat`, `/proc/meminfo`): https://man7.org/linux/man-pages/man5/proc.5.html
- MDN — `WEBGL_debug_renderer_info`: https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_debug_renderer_info
- MDN — `NetworkInformation.effectiveType`: https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/effectiveType
