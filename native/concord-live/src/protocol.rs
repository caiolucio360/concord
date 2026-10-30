//! Conversa com o Electron: um JSON por linha. Comandos chegam pelo stdin,
//! eventos saem pelo stdout (o stderr fica para os logs do libwebrtc).

use serde::{Deserialize, Serialize};

/// Degrau da live: caixa máxima (sem ampliar a fonte), fps e teto de bitrate.
/// Os valores vêm prontos do Electron (screenShareQuality.ts), o helper só aplica.
#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Quality {
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub max_bitrate: u64,
}

/// Qual encoder pedir ao libwebrtc. `Auto` = placa se houver (NVENC, depois
/// VAAPI), senão processador; o SDK cai sozinho para o processador se a placa falhar.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EncoderChoice {
    #[default]
    Auto,
    Software,
    Nvenc,
    Vaapi,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(tag = "cmd", rename_all = "camelCase")]
pub enum Command {
    /// Abre o seletor do sistema, entra na sala e publica.
    Start {
        url: String,
        token: String,
        quality: Quality,
        #[serde(default)]
        encoder: EncoderChoice,
        /// Som da tela (tudo menos a própria Salinha).
        #[serde(default)]
        audio: bool,
        /// Camada extra de 720p30 por baixo (quem tem internet fraca ou vê pequeno).
        #[serde(default)]
        simulcast: bool,
    },
    /// Troca de degrau ao vivo (escolha da pessoa ou do controlador).
    Quality { quality: Quality },
    Stop,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    BadCommand,
    /// A pessoa fechou o seletor do sistema (ou o portal não existe).
    CaptureDenied,
    ConnectFailed,
    PublishFailed,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "event", rename_all = "camelCase")]
pub enum Event {
    /// Primeiro quadro da fonte escolhida (tamanho original).
    Capturing { width: u32, height: u32 },
    /// Vídeo publicado na sala (`audio`: som da tela publicado junto).
    Published { codec: String, audio: bool },
    /// getStats() do envio, com os nomes do WebRTC (o controlador e o painel leem igual).
    Stats { stats: Vec<serde_json::Value> },
    Error { code: ErrorCode, message: String },
    /// A live acabou (fonte fechada, sala caiu ou `stop`); o processo sai em seguida.
    Ended { reason: String },
}

const MAX_FPS: u32 = 60;
const MIN_SIDE: u32 = 2;

fn valid(quality: &Quality) -> bool {
    (1..=MAX_FPS).contains(&quality.fps)
        && quality.width >= MIN_SIDE
        && quality.height >= MIN_SIDE
        && quality.max_bitrate > 0
}

fn quality_of(command: &Command) -> Option<&Quality> {
    match command {
        Command::Start { quality, .. } | Command::Quality { quality } => Some(quality),
        Command::Stop => None,
    }
}

/// Lê uma linha do stdin; degrau fora do intervalo é recusado (não chega ao encoder).
pub fn parse_command(line: &str) -> Result<Command, String> {
    let command: Command = serde_json::from_str(line.trim()).map_err(|e| e.to_string())?;
    match quality_of(&command) {
        Some(quality) if !valid(quality) => Err(format!("qualidade inválida: {quality:?}")),
        _ => Ok(command),
    }
}

/// Uma linha do stdout (sem a quebra).
pub fn event_line(event: &Event) -> String {
    serde_json::to_string(event).expect("eventos sempre serializam")
}

#[cfg(test)]
mod tests {
    use super::*;

    const START: &str = r#"{"cmd":"start","url":"wss://salinha.example","token":"jwt","quality":{"width":1920,"height":1080,"fps":30,"maxBitrate":4500000}}"#;

    #[test]
    fn start_tem_padroes_de_encoder_e_audio() {
        let command = parse_command(START).unwrap();
        assert_eq!(
            command,
            Command::Start {
                url: "wss://salinha.example".into(),
                token: "jwt".into(),
                quality: Quality { width: 1920, height: 1080, fps: 30, max_bitrate: 4_500_000 },
                encoder: EncoderChoice::Auto,
                audio: false,
                simulcast: false,
            }
        );
    }

    #[test]
    fn start_aceita_encoder_e_audio() {
        let line = START.replace("}}", r#"},"encoder":"vaapi","audio":true}"#);
        match parse_command(&line).unwrap() {
            Command::Start { encoder, audio, .. } => {
                assert_eq!(encoder, EncoderChoice::Vaapi);
                assert!(audio);
            }
            other => panic!("esperava start, veio {other:?}"),
        }
    }

    #[test]
    fn quality_e_stop() {
        let line = r#"{"cmd":"quality","quality":{"width":1280,"height":720,"fps":60,"maxBitrate":4500000}}"#;
        assert!(matches!(parse_command(line), Ok(Command::Quality { quality }) if quality.fps == 60));
        assert_eq!(parse_command(" {\"cmd\":\"stop\"}\r\n"), Ok(Command::Stop));
    }

    #[test]
    fn recusa_degrau_fora_do_intervalo() {
        let fps = r#"{"cmd":"quality","quality":{"width":1280,"height":720,"fps":0,"maxBitrate":1}}"#;
        let side = r#"{"cmd":"quality","quality":{"width":1,"height":720,"fps":30,"maxBitrate":1}}"#;
        let rate = r#"{"cmd":"quality","quality":{"width":1280,"height":720,"fps":30,"maxBitrate":0}}"#;
        let fast = r#"{"cmd":"quality","quality":{"width":1280,"height":720,"fps":61,"maxBitrate":1}}"#;
        for line in [fps, side, rate, fast] {
            assert!(parse_command(line).is_err(), "{line}");
        }
    }

    #[test]
    fn recusa_comando_desconhecido_ou_quebrado() {
        assert!(parse_command(r#"{"cmd":"explode"}"#).is_err());
        assert!(parse_command("não é json").is_err());
        assert!(parse_command(r#"{"cmd":"start","url":"x"}"#).is_err());
    }

    #[test]
    fn eventos_saem_numa_linha_com_o_nome_no_campo_event() {
        assert_eq!(
            event_line(&Event::Published { codec: "h264".into(), audio: true }),
            r#"{"event":"published","codec":"h264","audio":true}"#
        );
        assert_eq!(
            event_line(&Event::Error { code: ErrorCode::CaptureDenied, message: "x".into() }),
            r#"{"event":"error","code":"capture_denied","message":"x"}"#
        );
        assert_eq!(
            event_line(&Event::Capturing { width: 2560, height: 1440 }),
            r#"{"event":"capturing","width":2560,"height":1440}"#
        );
    }
}
