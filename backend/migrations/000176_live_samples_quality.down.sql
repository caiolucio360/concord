ALTER TABLE live_samples
    DROP COLUMN capture_fps,
    DROP COLUMN recv_fps,
    DROP COLUMN codec_ms,
    DROP COLUMN concealed_pct,
    DROP COLUMN recv_loss_pct,
    DROP COLUMN connect_ms;
