//! Tamanho e ritmo dos quadros: a mesma regra do Electron (captureSize em
//! screenShareQuality.ts) — cabe na caixa do degrau, sem ampliar nem mudar a
//! proporção. Lados pares: os encoders H.264 por placa recusam ímpares.

use std::time::Duration;

/// Tamanho da fonte dentro da caixa (largura × altura), sem ampliar.
pub fn fit(source: (u32, u32), bounds: (u32, u32)) -> (u32, u32) {
    let (width, height) = (source.0.max(1) as f64, source.1.max(1) as f64);
    let scale = (bounds.0 as f64 / width).min(bounds.1 as f64 / height).min(1.0);
    (even((width * scale).floor() as u32), even((height * scale).floor() as u32))
}

fn even(side: u32) -> u32 {
    (side & !1).max(2)
}

/// Intervalo entre pedidos de quadro ao capturador para o fps do degrau.
pub fn frame_interval(fps: u32) -> Duration {
    Duration::from_micros(1_000_000 / u64::from(fps.max(1)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reduz_para_caber_na_caixa_mantendo_a_proporcao() {
        assert_eq!(fit((2560, 1440), (1920, 1080)), (1920, 1080));
        assert_eq!(fit((3440, 1440), (1920, 1080)), (1920, 802));
        assert_eq!(fit((1920, 1200), (1280, 720)), (1152, 720));
    }

    #[test]
    fn nunca_amplia_a_fonte() {
        assert_eq!(fit((1280, 720), (1920, 1080)), (1280, 720));
    }

    #[test]
    fn lados_sempre_pares_e_no_minimo_2() {
        assert_eq!(fit((1366, 767), (2560, 1440)), (1366, 766));
        assert_eq!(fit((1, 1), (1920, 1080)), (2, 2));
        assert_eq!(fit((0, 0), (1920, 1080)), (2, 2));
    }

    #[test]
    fn intervalo_do_fps() {
        assert_eq!(frame_interval(30), Duration::from_micros(33_333));
        assert_eq!(frame_interval(60), Duration::from_micros(16_666));
        assert_eq!(frame_interval(0), Duration::from_secs(1));
    }
}
