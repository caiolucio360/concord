# Imagem para compilar o helper concord-live no Linux (scripts/build-linux.sh).
# Debian 12: glibc 2.36, o binário roda nas distros de 2023 para cá. clang 21+
# é exigência do libc++ que vem com o libwebrtc; libva e glib só pelos headers
# (as bibliotecas são carregadas em tempo de execução). cuda.h liga o NVENC; a
# libcuda e a libnvidia-encode também são carregadas só em tempo de execução.
FROM rust:1-bookworm
RUN apt-get -qq update \
 && apt-get -qq install -y lsb-release wget gnupg software-properties-common pkg-config \
      libva-dev libglib2.0-dev xz-utils patch >/dev/null \
 && wget -qO /tmp/llvm.sh https://apt.llvm.org/llvm.sh && bash /tmp/llvm.sh 21 >/dev/null \
 && ln -s /usr/bin/clang-21 /usr/local/bin/clang && ln -s /usr/bin/clang++-21 /usr/local/bin/clang++
RUN mkdir -p /opt/cuda \
 && wget -qO- https://developer.download.nvidia.com/compute/cuda/redist/cuda_cudart/linux-x86_64/cuda_cudart-linux-x86_64-12.6.77-archive.tar.xz \
    | tar -xJ -C /opt/cuda --strip-components=1 \
 && test -f /opt/cuda/include/cuda.h
ENV CUDA_HOME=/opt/cuda
