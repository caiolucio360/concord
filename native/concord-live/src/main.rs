//! concord-live: a live da Salinha pelo SDK Rust do LiveKit (docs/adr/0031).
//!
//! O Electron abre este processo, manda `start` pelo stdin e lê os eventos no
//! stdout (um JSON por linha, ver protocol.rs). stdin fechado = a Salinha
//! morreu ou recarregou: a live para e o processo sai.

mod protocol;
mod size;

#[cfg(target_os = "linux")]
mod capture;
#[cfg(target_os = "linux")]
mod session;
#[cfg(target_os = "linux")]
mod stats;

use protocol::{event_line, Event};

fn emit(event: Event) {
    use std::io::Write;
    let mut out = std::io::stdout().lock();
    let _ = writeln!(out, "{}", event_line(&event));
    let _ = out.flush();
}

#[cfg(target_os = "linux")]
fn main() {
    linux::main();
}

#[cfg(not(target_os = "linux"))]
fn main() {
    emit(Event::Ended { reason: "unsupported_platform".into() });
    std::process::exit(2);
}

#[cfg(target_os = "linux")]
mod linux {
    use std::io::BufRead;
    use std::sync::Arc;

    use tokio::sync::mpsc::{self, UnboundedSender};

    use crate::protocol::{parse_command, Command, ErrorCode, Event};
    use crate::session::{self, Start};

    /// Lê o stdin numa thread própria; EOF vira `stop`.
    fn read_stdin(tx: UnboundedSender<Command>) {
        std::thread::spawn(move || {
            for line in std::io::stdin().lock().lines() {
                let Ok(line) = line else { break };
                if line.trim().is_empty() {
                    continue;
                }
                match parse_command(&line) {
                    Ok(command) => {
                        if tx.send(command).is_err() {
                            return;
                        }
                    }
                    Err(message) => super::emit(Event::Error { code: ErrorCode::BadCommand, message }),
                }
            }
            let _ = tx.send(Command::Stop);
        });
    }

    fn start_of(command: Command) -> Option<Start> {
        match command {
            Command::Start { url, token, quality, encoder, simulcast, .. } => {
                Some(Start { url, token, quality, encoder, simulcast })
            }
            _ => None,
        }
    }

    pub fn main() {
        let (tx, mut rx) = mpsc::unbounded_channel();
        read_stdin(tx);
        let runtime = tokio::runtime::Builder::new_multi_thread().enable_all().build().expect("tokio");
        let reason = runtime.block_on(async move {
            loop {
                match rx.recv().await {
                    Some(Command::Stop) | None => return "stopped".to_string(),
                    Some(command) => {
                        if let Some(start) = start_of(command) {
                            return session::run(start, rx, Arc::new(super::emit)).await;
                        }
                    }
                }
            }
        });
        super::emit(Event::Ended { reason });
        // Threads do libwebrtc/glib não seguram o processo.
        std::process::exit(0);
    }
}
