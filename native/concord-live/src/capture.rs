//! Captura da tela pelo libwebrtc: no Linux o portal ScreenCast (o seletor do
//! sistema, Wayland e X11) entrega os quadros pelo PipeWire; sem portal, cai
//! para a tela inteira pelo X11. Cada quadro vira I420 no tamanho do degrau e
//! vai para a fonte de vídeo publicada.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};

use livekit::webrtc::desktop_capturer::{
    CaptureError, DesktopCaptureSourceType, DesktopCapturer, DesktopCapturerOptions, DesktopFrame,
};
use livekit::webrtc::native::yuv_helper;
use livekit::webrtc::prelude::{I420Buffer, VideoBuffer, VideoFrame, VideoRotation};
use livekit::webrtc::video_source::native::NativeVideoSource;
use tokio::sync::mpsc::UnboundedSender;

use crate::protocol::Quality;
use crate::size::{fit, frame_interval};

pub enum CaptureEvent {
    /// Primeiro quadro: a pessoa escolheu a fonte (tamanho original).
    Started { width: u32, height: u32 },
    /// Seletor cancelado antes do primeiro quadro, ou a fonte acabou depois.
    Failed,
}

/// Onde os quadros vão parar: a fonte publicada (None até publicar).
pub type Sink = Arc<Mutex<Option<NativeVideoSource>>>;

pub struct Capture {
    stop: Arc<AtomicBool>,
    thread: Option<JoinHandle<()>>,
}

impl Capture {
    pub fn spawn(quality: Arc<Mutex<Quality>>, sink: Sink, events: UnboundedSender<CaptureEvent>) -> Self {
        let stop = Arc::new(AtomicBool::new(false));
        let flag = stop.clone();
        let thread = thread::spawn(move || run(quality, sink, events, flag));
        Self { stop, thread: Some(thread) }
    }
}

impl Drop for Capture {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(thread) = self.thread.take() {
            let _ = thread.join();
        }
    }
}

fn new_capturer(kind: DesktopCaptureSourceType) -> Option<DesktopCapturer> {
    let mut options = DesktopCapturerOptions::new(kind);
    options.set_include_cursor(true);
    DesktopCapturer::new(options)
}

/// Portal (seletor do sistema); sem ele, a primeira tela do X11.
fn open_capturer() -> Option<(DesktopCapturer, bool)> {
    if let Some(capturer) = new_capturer(DesktopCaptureSourceType::Generic) {
        return Some((capturer, true));
    }
    new_capturer(DesktopCaptureSourceType::Screen).map(|capturer| (capturer, false))
}

fn run(quality: Arc<Mutex<Quality>>, sink: Sink, events: UnboundedSender<CaptureEvent>, stop: Arc<AtomicBool>) {
    let Some((mut capturer, portal)) = open_capturer() else {
        let _ = events.send(CaptureEvent::Failed);
        return;
    };
    let source = if portal { None } else { capturer.get_source_list().into_iter().next() };
    let mut converter = Converter::new(quality.clone(), sink, events, stop.clone());
    capturer.start_capture(source, move |result| converter.on_frame(result));
    while !stop.load(Ordering::SeqCst) {
        capturer.capture_frame();
        let fps = quality.lock().map(|q| q.fps).unwrap_or(30);
        thread::sleep(frame_interval(fps));
    }
}

/// Converte os quadros (BGRA da captura) e entrega à fonte publicada.
struct Converter {
    quality: Arc<Mutex<Quality>>,
    sink: Sink,
    events: UnboundedSender<CaptureEvent>,
    stop: Arc<AtomicBool>,
    started: bool,
    full: I420Buffer,
}

impl Converter {
    fn new(quality: Arc<Mutex<Quality>>, sink: Sink, events: UnboundedSender<CaptureEvent>, stop: Arc<AtomicBool>) -> Self {
        Self { quality, sink, events, stop, started: false, full: I420Buffer::new(2, 2) }
    }

    fn on_frame(&mut self, result: Result<DesktopFrame, CaptureError>) {
        match result {
            Ok(frame) => self.deliver(&frame),
            // Sem quadro novo (tela parada) ou soluço do compositor: espera o próximo.
            Err(CaptureError::Temporary) => {}
            Err(CaptureError::Permanent) => self.fail(),
        }
    }

    fn fail(&mut self) {
        if !self.stop.swap(true, Ordering::SeqCst) {
            let _ = self.events.send(CaptureEvent::Failed);
        }
    }

    fn deliver(&mut self, frame: &DesktopFrame) {
        let (width, height) = (frame.width().max(2) as u32 & !1, frame.height().max(2) as u32 & !1);
        if !self.started {
            self.started = true;
            let _ = self.events.send(CaptureEvent::Started { width, height });
        }
        // Clone barato (referência à mesma fonte); solta o lock antes de converter.
        let Some(source) = self.sink.lock().ok().and_then(|sink| sink.clone()) else { return };
        self.convert(frame, width, height);
        let bounds = self.quality.lock().map(|q| (q.width, q.height)).unwrap_or((width, height));
        let target = fit((width, height), bounds);
        let buffer = if target == (width, height) {
            None
        } else {
            Some(self.full.scale(target.0 as i32, target.1 as i32))
        };
        let frame = VideoFrame {
            rotation: VideoRotation::VideoRotation0,
            timestamp_us: 0,
            frame_metadata: None,
            buffer: buffer.as_ref().unwrap_or(&self.full),
        };
        source.capture_frame(&frame);
    }

    /// BGRA → I420 no tamanho da fonte (reaproveita o buffer).
    fn convert(&mut self, frame: &DesktopFrame, width: u32, height: u32) {
        if self.full.width() != width || self.full.height() != height {
            self.full = I420Buffer::new(width, height);
        }
        let (stride_y, stride_u, stride_v) = self.full.strides();
        let (y, u, v) = self.full.data_mut();
        yuv_helper::argb_to_i420(
            frame.data(),
            frame.stride(),
            y,
            stride_y,
            u,
            stride_u,
            v,
            stride_v,
            width as i32,
            height as i32,
        );
    }
}
