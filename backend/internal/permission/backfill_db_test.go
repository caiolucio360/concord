package permission_test

import (
	"context"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"gin-quickstart/backend/internal/permission"
	"gin-quickstart/backend/internal/platform/database"
	"gin-quickstart/backend/internal/role"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// isolatedDB cria um banco só deste teste no mesmo servidor do TEST_DATABASE_URL
// e o apaga no fim. Os outros testes de banco compartilham o schema já migrado;
// o de backfill precisa voltar a versão e remigrar, o que não pode sujar o deles.
func isolatedDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	admin := testDB(t)
	ctx := context.Background()
	name := "perm_backfill_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	if _, err := admin.Exec(ctx, `CREATE DATABASE `+name); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { admin.Exec(ctx, `DROP DATABASE IF EXISTS `+name+` WITH (FORCE)`) })

	cfg, err := pgxpool.ParseConfig(os.Getenv("TEST_DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	cfg.ConnConfig.Database = name
	db, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(db.Close)
	return db
}

// migrationsBefore copia para um diretório temporário só as migrations de
// versão menor que limit: o banco de produção antes da 029.
func migrationsBefore(t *testing.T, limit int) string {
	t.Helper()
	dir := t.TempDir()
	entries, err := os.ReadDir("../../migrations")
	if err != nil {
		t.Fatal(err)
	}
	for _, entry := range entries {
		version, err := strconv.Atoi(strings.SplitN(entry.Name(), "_", 2)[0])
		if err != nil {
			t.Fatalf("migration sem número: %s", entry.Name())
		}
		if version >= limit {
			continue
		}
		raw, err := os.ReadFile(filepath.Join("../../migrations", entry.Name()))
		if err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(dir, entry.Name()), raw, 0o600); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

// seedLegacyServer cria um servidor do tempo em que cargo era a coluna
// server_members.role: o dono e um admin ('admin') e um membro comum ('member').
func seedLegacyServer(t *testing.T, db *pgxpool.Pool) (serverID, owner, admin, plain string) {
	t.Helper()
	ctx := context.Background()
	owner, admin, plain = newUser(t, db, ctx), newUser(t, db, ctx), newUser(t, db, ctx)
	serverID = uuid.NewString()
	if _, err := db.Exec(ctx, `INSERT INTO servers (id, name, icon_url, owner_id) VALUES ($1, 's', '', $2)`, serverID, owner); err != nil {
		t.Fatal(err)
	}
	for user, roleName := range map[string]string{owner: "admin", admin: "admin", plain: "member"} {
		if _, err := db.Exec(ctx, `INSERT INTO server_members (server_id, user_id, role) VALUES ($1, $2, $3)`, serverID, user, roleName); err != nil {
			t.Fatal(err)
		}
	}
	return serverID, owner, admin, plain
}

// assertBackfilledRoles confere os cargos de um servidor antigo depois das
// migrations: @everyone, Bots (053) e o Moderador que já existia, nesta ordem
// de posição (do mais alto para o mais baixo).
func assertBackfilledRoles(t *testing.T, db *pgxpool.Pool, serverID string) {
	t.Helper()
	roles, err := role.RoleRepository(db).List(context.Background(), serverID)
	if err != nil || len(roles) != 3 {
		t.Fatalf("roles = %+v, %v", roles, err)
	}
	moderator, bots, everyone := roles[0], roles[1], roles[2]
	if everyone.Permissions != permission.DefaultEveryone || !everyone.IsDefault {
		t.Errorf("@everyone errado: %+v", everyone)
	}
	if bots.Name != permission.BotsRoleName || !bots.IsSystem || !bots.Hoist {
		t.Errorf("cargo Bots errado: %+v", bots)
	}
	if moderator.Name != "Moderador" || moderator.Permissions != legacyModerator || moderator.IsSystem {
		t.Errorf("Moderador antigo errado: %+v", moderator)
	}
}

// A migration tem que transformar os servidores que já existiam: cada um ganha
// @everyone, Bots e (quem era role='admin', fora o dono) o Moderador. O dono
// não precisa de cargo (docs/CARGOS.md).
//
// Roda num banco próprio (isolatedDB): volta a versão para 28 e remigra tudo,
// sem tocar no schema dos outros testes nem herdar o estado deles.
func TestDBMigrationBackfillsExistingServers(t *testing.T) {
	db := isolatedDB(t)
	ctx := context.Background()

	// Banco só com as migrations anteriores à 029, como produção antes dela.
	// As posteriores ficam de fora e rodam depois, em cima dos dados.
	if err := database.Migrate(db, migrationsBefore(t, 29)); err != nil {
		t.Fatal(err)
	}
	serverID, owner, admin, plain := seedLegacyServer(t, db)
	if err := database.Migrate(db, "../../migrations"); err != nil {
		t.Fatal(err)
	}

	assertBackfilledRoles(t, db, serverID)

	snap, err := permission.PermissionService(permission.PermissionRepository(db)).Snapshot(ctx, serverID)
	if err != nil {
		t.Fatal(err)
	}
	assertBackfilledAccess(t, snap, owner, admin, plain)
}

// assertBackfilledAccess confere o que cada pessoa pode no servidor migrado.
func assertBackfilledAccess(t *testing.T, snap *permission.Snapshot, owner, admin, plain string) {
	t.Helper()
	if !permission.Has(snap.Server(admin), permission.ManageChannels|permission.MoveMembers) {
		t.Error("o antigo admin virou Moderador e mantém o que fazia")
	}
	if permission.Has(snap.Server(plain), permission.ManageChannels) {
		t.Error("membro comum não ganha poderes")
	}
	if len(snap.MemberRoles[owner]) != 0 {
		t.Errorf("o dono não precisa de cargo (já tem tudo): %v", snap.MemberRoles[owner])
	}
	if snap.Server(owner) != permission.All {
		t.Error("o dono continua com tudo")
	}
	// 000039: todo mundo pode mudar o próprio apelido; o Moderador, o dos outros.
	if !permission.Has(snap.Server(plain), permission.ChangeNickname) || permission.Has(snap.Server(plain), permission.ManageNicknames) {
		t.Error("membro comum muda só o próprio apelido")
	}
	if !permission.Has(snap.Server(admin), permission.ChangeNickname|permission.ManageNicknames) {
		t.Error("o Moderador muda apelidos")
	}
	// 000127: todo mundo pode usar /tts.
	if !permission.Has(snap.Server(plain), permission.SendTTSMessages) {
		t.Error("membro comum usa /tts")
	}
}
