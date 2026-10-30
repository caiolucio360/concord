package emoji

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// uniqueViolation: código do Postgres para chave única repetida (o nome).
const uniqueViolation = "23505"

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Create grava o emoji respeitando o limite do servidor: numa transação com
// um lock por servidor, conta e insere, então envios ao mesmo tempo não passam
// de MaxEmojisPerServer.
func (r *Repository) Create(ctx context.Context, e *Emoji) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := lockServerAndCheckRoom(ctx, tx, e.ServerID); err != nil {
		return err
	}
	err = tx.QueryRow(ctx, `
		INSERT INTO server_emojis (id, server_id, uploader_id, name, content_type, size_bytes)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at`,
		e.ID, e.ServerID, e.UploaderID, e.Name, e.ContentType, e.SizeBytes,
	).Scan(&e.CreatedAt)
	if err != nil {
		return nameTaken(err)
	}
	return tx.Commit(ctx)
}

// lockServerAndCheckRoom: lock da transação por servidor e a contagem dentro dele.
func lockServerAndCheckRoom(ctx context.Context, tx pgx.Tx, serverID string) error {
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended('server_emojis:' || $1, 0))`, serverID); err != nil {
		return err
	}
	var count int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM server_emojis WHERE server_id = $1`, serverID).Scan(&count); err != nil {
		return err
	}
	if count >= MaxEmojisPerServer {
		return ErrServerFull
	}
	return nil
}

// nameTaken troca a violação do índice único (o nome) pelo erro do domínio.
func nameTaken(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == uniqueViolation {
		return ErrNameTaken
	}
	return err
}

// ListForUser: numa consulta só, os emojis de todos os servidores de que a
// pessoa é membro, agrupados por servidor (servidores sem emoji ficam de fora).
func (r *Repository) ListForUser(ctx context.Context, userID string) ([]ServerEmojis, error) {
	if uuid.Validate(userID) != nil {
		return []ServerEmojis{}, nil
	}
	rows, err := r.db.Query(ctx, `
		SELECT s.id, s.name, s.icon_url,
		       e.id, e.uploader_id, e.name, e.content_type, e.size_bytes, e.created_at
		FROM server_members m
		JOIN servers s ON s.id = m.server_id
		JOIN server_emojis e ON e.server_id = m.server_id
		WHERE m.user_id = $1
		ORDER BY lower(s.name), s.id, e.created_at`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanGroups(rows)
}

// scanGroups: as linhas vêm ordenadas por servidor; cada uma vai para o grupo dele.
func scanGroups(rows pgx.Rows) ([]ServerEmojis, error) {
	groups := make([]ServerEmojis, 0)
	for rows.Next() {
		var g ServerEmojis
		var e Emoji
		if err := rows.Scan(&g.ServerID, &g.ServerName, &g.ServerIconURL,
			&e.ID, &e.UploaderID, &e.Name, &e.ContentType, &e.SizeBytes, &e.CreatedAt); err != nil {
			return nil, err
		}
		e.ServerID = g.ServerID
		groups = appendToGroup(groups, g, e)
	}
	return groups, rows.Err()
}

// appendToGroup: as linhas vêm ordenadas por servidor, então o emoji é do
// último grupo ou abre um novo.
func appendToGroup(groups []ServerEmojis, g ServerEmojis, e Emoji) []ServerEmojis {
	if n := len(groups); n > 0 && groups[n-1].ServerID == g.ServerID {
		groups[n-1].Emojis = append(groups[n-1].Emojis, e)
		return groups
	}
	g.Emojis = []Emoji{e}
	return append(groups, g)
}

func (r *Repository) FindByID(ctx context.Context, id string) (*Emoji, error) {
	if uuid.Validate(id) != nil {
		return nil, ErrEmojiNotFound
	}
	var e Emoji
	err := r.db.QueryRow(ctx, `
		SELECT id, server_id, uploader_id, name, content_type, size_bytes, created_at
		FROM server_emojis WHERE id = $1`, id,
	).Scan(&e.ID, &e.ServerID, &e.UploaderID, &e.Name, &e.ContentType, &e.SizeBytes, &e.CreatedAt)
	if err != nil {
		return nil, notFound(err)
	}
	return &e, nil
}

// notFound troca o "nenhuma linha" do pgx pelo erro do domínio.
func notFound(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrEmojiNotFound
	}
	return err
}

func (r *Repository) CountByServer(ctx context.Context, serverID string) (int, error) {
	if uuid.Validate(serverID) != nil {
		return 0, nil
	}
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM server_emojis WHERE server_id = $1`, serverID).Scan(&count)
	return count, err
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	if uuid.Validate(id) != nil {
		return ErrEmojiNotFound
	}
	tag, err := r.db.Exec(ctx, `DELETE FROM server_emojis WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrEmojiNotFound
	}
	return nil
}
