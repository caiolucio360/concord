package message_test

import (
	"context"
	"os"
	"sync/atomic"
	"testing"

	"gin-quickstart/backend/internal/channel"
	"gin-quickstart/backend/internal/message"
	"gin-quickstart/backend/internal/permission"
	"gin-quickstart/backend/internal/platform/database"
	"gin-quickstart/backend/internal/role"
	"gin-quickstart/backend/internal/server"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// queryCounter conta as consultas que o pool manda ao Postgres.
type queryCounter struct{ n atomic.Int64 }

func (c *queryCounter) TraceQueryStart(ctx context.Context, _ *pgx.Conn, _ pgx.TraceQueryStartData) context.Context {
	c.n.Add(1)
	return ctx
}
func (c *queryCounter) TraceQueryEnd(context.Context, *pgx.Conn, pgx.TraceQueryEndData) {}

type silentPublisher struct{ message.EventPublisher }

func (silentPublisher) PublishMessageCreate(message.CreateEvent) {}

// Num Postgres de verdade (TEST_DATABASE_URL): quantas consultas custam as
// duas operações mais quentes do chat, com as permissões já em cache. É a
// guarda contra consulta a mais (ou N+1) voltar sem ninguém notar.
func TestDBQueriesPerHotOperation(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL não definido")
	}
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		t.Fatal(err)
	}
	counter := &queryCounter{}
	cfg.ConnConfig.Tracer = counter
	db, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(db.Close)
	if err := database.Migrate(db, "../../migrations"); err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	userID := uuid.NewString()
	if _, err := db.Exec(ctx, `INSERT INTO users (id, username, display_name, email, password_hash) VALUES ($1, $2::text, $2::text, $2::text || '@ex.com', 'x')`, userID, "q"+userID[:8]); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Exec(ctx, `DELETE FROM users WHERE id = $1`, userID) })

	perms := permission.PermissionService(permission.PermissionRepository(db))
	serverRepo := server.ServerRepository(db)
	serverRepo.SetPermissionCache(perms)
	srv := &server.Server{Name: "s", OwnerID: userID}
	if err := server.ServerService(serverRepo, nil, role.RoleRepository(db)).Create(ctx, srv); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Exec(ctx, `DELETE FROM servers WHERE id = $1`, srv.ID) })
	channels := channel.ChannelService(channel.ChannelRepository(db), nil)
	channels.SetPermissionCache(perms)
	ch := &channel.Channel{ServerID: srv.ID, Name: "geral", Type: channel.TypeText, CreatedBy: userID}
	if err := channels.Create(ctx, ch); err != nil {
		t.Fatal(err)
	}
	svc := message.MessageService(message.MessageRepository(db), silentPublisher{}, perms, nil, nil, perms)

	// O handler confere o acesso antes (enche o cache de permissões e o
	// índice canal -> servidor); o serviço roda depois disso.
	if _, err := perms.ChannelPerms(ctx, ch.ID, userID); err != nil {
		t.Fatal(err)
	}
	cost := func(run func() error) int64 {
		t.Helper()
		before := counter.n.Load()
		if err := run(); err != nil {
			t.Fatal(err)
		}
		return counter.n.Load() - before
	}

	send := func() error {
		_, err := svc.CreateChannelMessage(ctx, ch.ID, userID, "olá", nil, nil, nil, nil, nil)
		return err
	}
	_ = cost(send) // aquece
	// Gravar e reler a mensagem: a nova não tem reação nem anexo para buscar.
	if got := cost(send); got != 2 {
		t.Errorf("enviar mensagem de texto = %d consultas, queria 2 (gravar e reler)", got)
	}

	// Com anexo, a mensagem publicada leva o anexo (aí a consulta extra vale).
	attachmentID := uuid.NewString()
	if _, err := db.Exec(ctx, `INSERT INTO message_attachments (id, uploader_id, channel_id, kind, content_type, filename, size_bytes) VALUES ($1, $2, $3, 'image', 'image/png', 'a.png', 10)`, attachmentID, userID, ch.ID); err != nil {
		t.Fatal(err)
	}
	withFile, err := svc.CreateChannelMessage(ctx, ch.ID, userID, "foto", nil, []string{attachmentID}, nil, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(withFile.Attachments) != 1 || withFile.Attachments[0].ID != attachmentID {
		t.Errorf("mensagem com anexo voltou com %d anexos, queria o anexo enviado", len(withFile.Attachments))
	}

	// Respostas: só à mensagem da mesma sala; espaços e id vazio não contam.
	target, err := svc.CreateChannelMessage(ctx, ch.ID, userID, "alvo", nil, nil, nil, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	reply := func(id string) (*message.Message, error) {
		return svc.CreateChannelMessage(ctx, ch.ID, userID, "resposta", &id, nil, nil, nil, nil)
	}
	if m, err := reply("  " + target.ID + " "); err != nil || m.ReplyToID == nil || *m.ReplyToID != target.ID {
		t.Errorf("resposta com espaços: %+v, %v", m, err)
	}
	if m, err := reply("   "); err != nil || m.ReplyToID != nil {
		t.Errorf("id vazio não é resposta: %+v, %v", m, err)
	}
	if _, err := reply(uuid.NewString()); err == nil {
		t.Error("responder a mensagem que não existe deveria falhar")
	}
	otherChannel := &channel.Channel{ServerID: srv.ID, Name: "outro", Type: channel.TypeText, CreatedBy: userID}
	if err := channels.Create(ctx, otherChannel); err != nil {
		t.Fatal(err)
	}
	foreign, err := svc.CreateChannelMessage(ctx, otherChannel.ID, userID, "de outro canal", nil, nil, nil, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := reply(foreign.ID); err == nil {
		t.Error("responder a mensagem de outro canal deveria falhar")
	}

	for range 50 {
		if err := send(); err != nil {
			t.Fatal(err)
		}
	}
	list := func() error {
		_, err := svc.ListChannelMessages(ctx, ch.ID, userID, 50, "")
		return err
	}
	// Em lote: mensagens, reações, enquetes e anexos, não importa quantas mensagens.
	if got := cost(list); got > 4 {
		t.Errorf("abrir o canal com 50 mensagens = %d consultas, queria no máximo 4 (em lote)", got)
	}
}
