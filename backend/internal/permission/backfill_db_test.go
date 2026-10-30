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
)

// A migration tem que transformar os servidores que já existiam: cada um ganha
// @everyone, Bots e Moderador, e quem era role='admin' (fora o dono) vira Moderador.
//
// Atenção: este teste desfaz a 029 e a refaz, então só serve com banco
// descartável (como o resto) e não deve rodar ao mesmo tempo que outros testes
// de banco do mesmo schema (use go test -p 1 localmente).
func TestDBMigrationBackfillsExistingServers(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()

	// Banco só com as migrations anteriores à 029, como produção antes dela.
	// As posteriores (030, 031, ...) também ficam de fora: se entrassem, o
	// banco iria para a versão mais alta e o Migrate pularia a 029 depois. A
	// 039 (apelidos) e a 053 (Bots) mexem nos cargos: rodam depois, junto com a 029.
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
		if version >= 29 {
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
	if _, err := db.Exec(ctx, `DROP TABLE IF EXISTS server_bans, channel_overwrites, member_roles, roles CASCADE`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `ALTER TABLE server_members DROP COLUMN IF EXISTS nickname`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `UPDATE schema_migrations SET version = 28`); err != nil {
		// Primeira execução neste banco: o Migrate cria a tabela.
		t.Log("schema_migrations ainda não existe:", err)
	}
	if err := database.Migrate(db, dir); err != nil {
		t.Fatal(err)
	}

	owner, admin, plain := newUser(t, db, ctx), newUser(t, db, ctx), newUser(t, db, ctx)
	serverID := uuid.NewString()
	if _, err := db.Exec(ctx, `INSERT INTO servers (id, name, icon_url, owner_id) VALUES ($1, 's', '', $2)`, serverID, owner); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Exec(ctx, `DELETE FROM servers WHERE id = $1`, serverID) })
	for user, roleName := range map[string]string{owner: "admin", admin: "admin", plain: "member"} {
		if _, err := db.Exec(ctx, `INSERT INTO server_members (server_id, user_id, role) VALUES ($1, $2, $3)`, serverID, user, roleName); err != nil {
			t.Fatal(err)
		}
	}

	// Agora aplica a 029 (e a 039, 053) em cima dos dados.
	if err := database.Migrate(db, "../../migrations"); err != nil {
		t.Fatal(err)
	}

	roles, err := role.RoleRepository(db).List(ctx, serverID)
	if err != nil || len(roles) != 3 {
		t.Fatalf("roles = %+v, %v", roles, err)
	}
	if roles[2].Permissions != permission.DefaultEveryone || !roles[2].IsDefault ||
		roles[1].Name != permission.BotsRoleName || !roles[1].IsSystem || !roles[1].Hoist ||
		roles[0].Permissions != legacyModerator || roles[0].Name != "Moderador" {
		t.Errorf("cargos padrão errados: %+v", roles)
	}

	svc := permission.PermissionService(permission.PermissionRepository(db))
	snap, err := svc.Snapshot(ctx, serverID)
	if err != nil {
		t.Fatal(err)
	}
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
}
