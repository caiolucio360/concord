# 0031. Transmitir a tela pelo helper Rust com o SDK Rust do LiveKit (marco 1, Linux)

- Status: aceito
- Data: 2026-10-30

## Contexto
Fase 1 da migração da mídia para Rust (decisão do dono: mídia em Rust ainda no
Electron → módulos nativos → Tauri). O ganho maior está na live: no Linux o
Chromium não codifica na NVIDIA (só VA-API, ADR 0020) e, nesta máquina AMD, o
próprio app instalado relata `video_encode=disabled_software` (a live sai no
OpenH264). O telinha (MIT) mostra que captura pelo portal + encoder da placa fora
do navegador funciona. Voz e câmera ficam para os próximos marcos.

## Opções consideradas
1. Helper Rust com o SDK Rust do LiveKit (`livekit` 0.10, Apache-2.0): libwebrtc
   pré-compilada, captura `DesktopCapturer` (portal ScreenCast/PipeWire, X11 de
   reserva), encoders VAAPI (H.264) e NVENC (H.264/H.265/AV1) no Linux, mesmo SFU.
2. Pipeline próprio (captura + NVENC/VAAPI em C como o telinha) entregando quadros
   já codificados ao SDK: mais controle (VBV, IDR), muito mais código.
3. Seguir só com o Chromium: sem encoder da NVIDIA no Linux, sem som da tela.

## Decisão
Opção 1, num binário próprio `native/concord-live` (o `concord-audio` segue
Windows-only, alvo GNU e leve; este traz ~28 MB de libwebrtc). O helper entra na
sala da call como o participante **`<userId>:screen`**, com token emitido pelo
backend só para isso (`POST /calls/:id/screen-token`: só quem está na call e pode
transmitir; publica só `screen_share`/`screen_share_audio`, sem assinar nem dados).
Quem assiste atribui a tela desse participante ao dono (`mediaOwner`), sem mudança
visual. O Electron conversa com o helper por JSON em linhas (start/quality/stop →
capturing/published/stats/error/ended); as estatísticas vêm com os nomes do
WebRTC, então o **mesmo controlador de degraus** (ScreenAdapt) e o mesmo painel
leem a live nativa: o Electron decide o degrau e manda ao helper (não há lógica
duplicada em Rust). Codec: **só H.264** (placa → processador), com a camada
extra de 720p30: o SDK Rust ainda não publica codec de reserva, e AV1/H.265
deixariam sem imagem quem não decodifica.

Opt-in no modal da live ("Transmitir pelo motor nativo (beta)", padrão
desligado), automático com placa só NVIDIA no Linux se o helper existir. Qualquer
falha antes de publicar segue pelo Chromium; queda no meio volta para a live pelo
Chromium (a pessoa escolhe a tela de novo) e o motor fica desligado até reabrir o
app. Fechar o seletor do sistema não abre outro.

## Consequências
- **Bug do SDK (VAAPI)**: o escritor de bits do encoder VAAPI faz `x << 32`
  (indefinido em C++); com clang otimizado o SPS sai com código de início
  `00 00 00 00` e o Mesa (radeonsi) aborta com buffer overflow no primeiro quadro.
  Contorno: a cola C++ do `webrtc-sys` compila em `-O0` por padrão (Cargo.toml);
  o build de release aplica `patches/webrtc-sys-vaapi-sps.patch` e compila em
  `-O3` (≈10–15 pontos de CPU a menos). Reportar/abrir PR no livekit/rust-sdks.
- **Empacotamento Linux**: `scripts/build-linux.sh` compila o helper num Debian 12
  (glibc 2.36; o binário feito no Arch exige glibc 2.44) com clang 21 (exigência
  do libc++ do libwebrtc) e o `cuda.h` do redistribuível da NVIDIA; libcuda,
  libnvidia-encode, libva e X11 são carregadas em tempo de execução. Vai em
  `resources/concord-live` (AppImage e .tar.gz). +28 MB no app.
- **Windows fica para depois**: o SDK Rust não tem encoder por placa no Windows
  (sem Media Foundation/NVENC; o Chromium já faz AV1/H.265/H.264 na placa lá) e a
  libwebrtc pré-compilada é MSVC (o `concord-audio` é GNU/mingw). Caminho: alvo
  `x86_64-pc-windows-msvc` com `cargo-xwin` e encoder próprio (NVENC/MF) via
  frames pré-codificados (`NativeVideoSource::new_encoded`).
- **Som da tela no Linux**: não entrou neste marco (o modal continua dizendo que
  vai só o vídeo). Caminho: `pipewire-rs` ligando a saída de cada app, menos os
  PIDs da Salinha, a uma entrada do helper (truque do telinha/venmic) →
  `NativeAudioSource` publicado como `screen_share_audio`.
- **Próximos marcos**: voz (microfone com o RNNoise já em Rust,
  `native/concord-dsp`) e câmera no mesmo helper, e então trocar o IPC por
  napi-rs (fase 2).

## Fontes
- https://github.com/livekit/rust-sdks (webrtc-sys: `video_encoder_factory.cpp`,
  `vaapi/`, `nvidia/`, `build.rs`; exemplo `examples/screensharing`)
- https://crates.io/crates/livekit (0.10.0, Apache-2.0)
- Mesa `src/gallium/frontends/va/picture.c` (`vlVaAddRawHeader`) e
  `picture_h264_enc.c` (parse dos cabeçalhos empacotados)
- telinha (MIT): `/home/nicccls/.cache/agentes/telinha.relatorio.md`
