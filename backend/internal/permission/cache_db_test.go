package permission_test

import (
	"errors"
	"testing"

	"gin-quickstart/backend/internal/permission"
)

// O cache de permissões não tem TTL: cada escrita de verdade (entrar, ser
// expulso, ser banido, apagar o servidor) precisa aparecer na checagem
// seguinte, com o snapshot do servidor já guardado.
func TestDBCacheFollowsMembershipChanges(t *testing.T) {
	e := newEnv(t)
	owner := newUser(t, e.db, e.ctx)
	srv := e.newServer(t, owner)
	member := newUser(t, e.db, e.ctx)
	banned := newUser(t, e.db, e.ctx)

	isMember := func(userID string) bool {
		t.Helper()
		_, err := e.permissions.ServerPerms(e.ctx, srv.ID, userID)
		if err != nil && !errors.Is(err, permission.ErrNotMember) {
			t.Fatal(err)
		}
		return err == nil
	}

	if isMember(member) { // guarda o snapshot sem ele
		t.Fatal("ainda não entrou")
	}
	e.join(t, srv.ID, member)
	e.join(t, srv.ID, banned)
	if !isMember(member) || !isMember(banned) {
		t.Fatal("entrou: a checagem seguinte já vê o membro")
	}

	if err := e.moderation.Kick(e.ctx, srv.ID, owner, member); err != nil {
		t.Fatal(err)
	}
	if isMember(member) {
		t.Fatal("expulso continua membro no cache")
	}

	if err := e.moderation.Ban(e.ctx, srv.ID, owner, banned, "spam"); err != nil {
		t.Fatal(err)
	}
	if isMember(banned) {
		t.Fatal("banido continua membro no cache")
	}

	if err := e.serverSvc.Delete(e.ctx, srv.ID); err != nil {
		t.Fatal(err)
	}
	if isMember(owner) {
		t.Fatal("servidor apagado continua no cache")
	}
}

// Cargo dado muda a permissão na hora.
func TestDBCacheFollowsRoleChanges(t *testing.T) {
	e := newEnv(t)
	owner := newUser(t, e.db, e.ctx)
	srv := e.newServer(t, owner)
	member := newUser(t, e.db, e.ctx)
	e.join(t, srv.ID, member)
	mod := e.newModerator(t, srv.ID)
	e.permissions.InvalidateServer(srv.ID) // newModerator escreve pelo repositório cru

	if err := e.permissions.Require(e.ctx, srv.ID, member, permission.KickMembers); !errors.Is(err, permission.ErrMissingPermission) {
		t.Fatalf("sem cargo: err = %v", err)
	}
	if _, err := e.roleSvc.SetMemberRole(e.ctx, srv.ID, owner, member, mod.ID, true); err != nil {
		t.Fatal(err)
	}
	if err := e.permissions.Require(e.ctx, srv.ID, member, permission.KickMembers); err != nil {
		t.Fatalf("com o cargo, a checagem seguinte já vê: %v", err)
	}
}
