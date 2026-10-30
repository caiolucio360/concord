#!/usr/bin/env bash
# Build de release do concord-live (roda dentro da imagem do Dockerfile ao lado).
# O webrtc-sys vai corrigido (patches/) e otimizado; sem o patch, o Cargo.toml
# compila a cola C++ dele em -O0 (contorno do bug do VAAPI, mais CPU). ADR 0031.
set -euo pipefail
cd "$(dirname "$0")"
cargo fetch --locked
# O [patch] reescreve o Cargo.lock; o do repositório volta no fim.
mkdir -p target && cp Cargo.lock target/Cargo.lock.orig
trap 'cp target/Cargo.lock.orig Cargo.lock' EXIT
SRC="$(find "${CARGO_HOME:-$HOME/.cargo}/registry/src" -maxdepth 1 -mindepth 1 -type d | head -1)/webrtc-sys-0.3.52"
VENDOR="$PWD/target/webrtc-sys-patched"
rm -rf "$VENDOR" && cp -r "$SRC" "$VENDOR"
patch -d "$VENDOR" -p1 < patches/webrtc-sys-vaapi-sps.patch
cargo build --release \
  --config "patch.crates-io.webrtc-sys.path=\"$VENDOR\"" \
  --config 'profile.release.package.webrtc-sys.opt-level=3'
ls -la target/release/concord-live
