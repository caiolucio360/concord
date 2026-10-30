-- Emojis personalizados por servidor (docs/adr/0028-emojis-personalizados.md).
-- O arquivo fica em uploads/emojis/<id>; id novo a cada envio, nunca muda.
CREATE TABLE server_emojis (
    id UUID PRIMARY KEY,
    server_id UUID NOT NULL REFERENCES servers (id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name VARCHAR(32) NOT NULL CHECK (name ~ '^[A-Za-z0-9_]{2,32}$'),
    content_type VARCHAR(64) NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes BETWEEN 1 AND 262144), -- até 256 KB
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Nome único no servidor (sem diferenciar maiúsculas); também serve à contagem
-- e à listagem por servidor.
CREATE UNIQUE INDEX idx_server_emojis_name ON server_emojis (server_id, lower(name));

-- Permissão nova (backend/internal/permission/perms.go): ADD_EMOJIS
-- (1<<15 = 32768), ligada no @everyone e no Moderador criado com o servidor,
-- como a 000125 fez com ADD_STICKERS.
UPDATE roles SET permissions = permissions | 32768 WHERE is_default;
UPDATE roles SET permissions = permissions | 32768 WHERE name = 'Moderador' AND NOT is_default;
