//! Uma live: abre o seletor, entra na sala como o participante "tela"
//! (`<userId>:screen`, token só para isso), publica e responde aos comandos
//! até acabar. Só H.264 (placa → processador): o SDK Rust ainda não publica
//! codec de reserva, e AV1/H.265 deixariam sem imagem quem não decodifica.

use std::sync::{Arc, Mutex};
use std::time::Duration;

use livekit::options::{TrackPublishOptions, VideoCodec, VideoEncoding, VideoPreset};
use livekit::prelude::*;
use livekit::webrtc::prelude::{RtcVideoSource, VideoResolution};
use livekit::webrtc::rtp_parameters::DegradationPreference;
use livekit::webrtc::rtp_sender::VideoEncoderBackend;
use livekit::webrtc::video_source::native::NativeVideoSource;
use tokio::sync::mpsc::{self, UnboundedReceiver};

use crate::capture::{Capture, CaptureEvent, Sink};
use crate::protocol::{Command, EncoderChoice, ErrorCode, Event, Quality};
use crate::size::fit;
use crate::stats;

const STATS_EVERY: Duration = Duration::from_secs(2);
/// Camada extra de baixo: 720p30 a 3 Mbps, igual à da live do Chromium (screenSimulcast.ts).
const LOW_LAYER_HEIGHT: u32 = 720;
const LOW_LAYER_BITRATE: u64 = 3_000_000;

pub struct Start {
    pub url: String,
    pub token: String,
    pub quality: Quality,
    pub encoder: EncoderChoice,
    pub simulcast: bool,
}

pub type Emit = Arc<dyn Fn(Event) + Send + Sync>;

fn backend(choice: EncoderChoice) -> VideoEncoderBackend {
    match choice {
        EncoderChoice::Auto => VideoEncoderBackend::Hardware,
        EncoderChoice::Software => VideoEncoderBackend::Software,
        EncoderChoice::Nvenc => VideoEncoderBackend::Nvenc,
        EncoderChoice::Vaapi => VideoEncoderBackend::Vaapi,
    }
}

/// A camada de 720p só existe se a principal for maior que ela.
fn low_layer(size: (u32, u32), simulcast: bool) -> Option<VideoPreset> {
    if !simulcast || size.1 <= LOW_LAYER_HEIGHT {
        return None;
    }
    let (width, height) = fit(size, (u32::MAX, LOW_LAYER_HEIGHT));
    Some(VideoPreset {
        width,
        height,
        encoding: VideoEncoding { max_bitrate: LOW_LAYER_BITRATE, max_framerate: 30.0 },
    })
}

fn publish_options(start: &Start, size: (u32, u32)) -> TrackPublishOptions {
    let layer = low_layer(size, start.simulcast);
    TrackPublishOptions {
        source: TrackSource::Screenshare,
        video_codec: VideoCodec::H264,
        video_encoder: backend(start.encoder),
        video_encoding: Some(VideoEncoding {
            max_bitrate: start.quality.max_bitrate,
            max_framerate: f64::from(start.quality.fps),
        }),
        simulcast: layer.is_some(),
        simulcast_layers: layer.map(|l| vec![l]),
        // Texto legível: com pouca banda solta quadros, não resolução (ADR 0020).
        degradation_preference: Some(DegradationPreference::MaintainResolution),
        ..Default::default()
    }
}

fn fail(emit: &Emit, code: ErrorCode, message: impl Into<String>) {
    emit(Event::Error { code, message: message.into() });
}

/// Espera a pessoa escolher a fonte no seletor (ou desistir).
async fn first_frame(
    capture_rx: &mut UnboundedReceiver<CaptureEvent>,
    commands: &mut UnboundedReceiver<Command>,
) -> Result<(u32, u32), Option<ErrorCode>> {
    loop {
        tokio::select! {
            event = capture_rx.recv() => match event {
                Some(CaptureEvent::Started { width, height }) => return Ok((width, height)),
                _ => return Err(Some(ErrorCode::CaptureDenied)),
            },
            command = commands.recv() => match command {
                Some(Command::Stop) | None => return Err(None),
                // Troca de degrau antes de publicar: o Electron manda de novo depois.
                Some(_) => {}
            },
        }
    }
}

async fn publish(start: &Start, size: (u32, u32), sink: &Sink) -> Result<(Room, UnboundedReceiver<RoomEvent>, LocalVideoTrack), (ErrorCode, String)> {
    let mut options = RoomOptions::default();
    // Não assina ninguém (o token nem deixa); o SFU pausa camadas sem espectador.
    options.auto_subscribe = false;
    options.dynacast = true;
    let (room, events) = Room::connect(&start.url, &start.token, options)
        .await
        .map_err(|e| (ErrorCode::ConnectFailed, e.to_string()))?;
    let target = fit(size, (start.quality.width, start.quality.height));
    let source = NativeVideoSource::new(VideoResolution { width: target.0, height: target.1 }, true);
    *sink.lock().expect("sink") = Some(source.clone());
    let track = LocalVideoTrack::create_video_track("screen", RtcVideoSource::Native(source));
    room.local_participant()
        .publish_track(LocalTrack::Video(track.clone()), publish_options(start, target))
        .await
        .map_err(|e| (ErrorCode::PublishFailed, e.to_string()))?;
    Ok((room, events, track))
}

async fn send_stats(track: &LocalVideoTrack, emit: &Emit) {
    if let Ok(raw) = track.get_stats().await {
        emit(Event::Stats { stats: stats::to_json(&raw) });
    }
}

/// Roda a live até acabar; devolve o motivo (vai no evento `ended`).
pub async fn run(start: Start, mut commands: UnboundedReceiver<Command>, emit: Emit) -> String {
    let quality = Arc::new(Mutex::new(start.quality));
    let sink: Sink = Arc::new(Mutex::new(None));
    let (capture_tx, mut capture_rx) = mpsc::unbounded_channel();
    let _capture = Capture::spawn(quality.clone(), sink.clone(), capture_tx);

    let size = match first_frame(&mut capture_rx, &mut commands).await {
        Ok(size) => size,
        Err(Some(code)) => {
            fail(&emit, code, "seletor fechado ou portal indisponível");
            return "capture_denied".into();
        }
        Err(None) => return "stopped".into(),
    };
    emit(Event::Capturing { width: size.0, height: size.1 });

    let (room, mut room_events, track) = match publish(&start, size, &sink).await {
        Ok(published) => published,
        Err((code, message)) => {
            fail(&emit, code, message);
            return "publish_failed".into();
        }
    };
    emit(Event::Published { codec: "h264".into(), audio: false });

    let mut ticker = tokio::time::interval(STATS_EVERY);
    let reason = loop {
        tokio::select! {
            _ = ticker.tick() => send_stats(&track, &emit).await,
            command = commands.recv() => match command {
                Some(Command::Quality { quality: next }) => *quality.lock().expect("quality") = next,
                Some(Command::Start { .. }) => {}
                Some(Command::Stop) | None => break "stopped",
            },
            event = capture_rx.recv() => if let Some(CaptureEvent::Failed) | None = event {
                break "capture_ended";
            },
            event = room_events.recv() => if let Some(RoomEvent::Disconnected { .. }) | None = event {
                break "disconnected";
            },
        }
    };
    *sink.lock().expect("sink") = None;
    let _ = room.close().await;
    reason.into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn camada_de_720p_so_acima_de_720p_e_se_pedida() {
        let layer = low_layer((1920, 1080), true).unwrap();
        assert_eq!((layer.width, layer.height), (1280, 720));
        assert_eq!(layer.encoding.max_bitrate, 3_000_000);
        assert!(low_layer((1920, 1080), false).is_none());
        assert!(low_layer((1280, 720), true).is_none());
    }

    #[test]
    fn camada_de_720p_mantem_a_proporcao_da_fonte() {
        let layer = low_layer((3440, 1440), true).unwrap();
        assert_eq!((layer.width, layer.height), (1720, 720));
    }

    #[test]
    fn automatico_pede_a_placa() {
        assert_eq!(backend(EncoderChoice::Auto), VideoEncoderBackend::Hardware);
        assert_eq!(backend(EncoderChoice::Software), VideoEncoderBackend::Software);
    }
}
