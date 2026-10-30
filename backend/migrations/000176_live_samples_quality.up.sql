-- Sinais de qualidade das lives e calls (ADR 0032): cada coluna responde uma
-- pergunta que leva a uma ação (tabela no ADR). Nulas = sem dado/outro tipo.
ALTER TABLE live_samples
    -- transmite: quadros/s que a captura entregou (media-source). Abaixo do
    -- alvo = o gargalo é a captura, não o codificador nem a rede.
    ADD COLUMN capture_fps REAL,
    -- assiste: quadros/s que chegaram (framesReceived). Chegam e não
    -- decodificam = o decodificador; não chegam = rede, SFU ou quem transmite.
    ADD COLUMN recv_fps REAL,
    -- ms por quadro no codec: codificar (transmite) ou decodificar (assiste).
    ADD COLUMN codec_ms REAL,
    -- call: % do áudio recebido que foi sintetizado (concealment sem o
    -- silêncio) = voz robotizada/cortes que eu ouvi.
    ADD COLUMN concealed_pct REAL,
    -- call: perda de pacotes no áudio que eu recebo (do SFU até mim).
    ADD COLUMN recv_loss_pct REAL,
    -- call: ms do "entrar" até a voz conectar (token + sinal + mídia); só na
    -- amostra seguinte à conexão.
    ADD COLUMN connect_ms INT;
