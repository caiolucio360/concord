package event

import (
	"context"
	"errors"
	"testing"
)

// fakeAccess: o que cada pessoa pode fazer com eventos, mais a configuração por
// cargo (só o dono mexe). "dono" é o dono do servidor.
type fakeAccess struct {
	actions map[string]Actions
	roles   map[string]Actions
	names   map[string]string
}

func newFakeAccess() *fakeAccess {
	return &fakeAccess{
		actions: map[string]Actions{"dono": AllActions},
		roles:   map[string]Actions{},
		names:   map[string]string{"cargo-a": "Cargo A", "cargo-b": "Cargo B"},
	}
}

func (f *fakeAccess) EventActions(_ context.Context, _, userID string) (Actions, error) {
	return f.actions[userID], nil
}

func (f *fakeAccess) IsOwner(_ context.Context, _, userID string) (bool, error) {
	return userID == "dono", nil
}

func (f *fakeAccess) RoleAccessList(context.Context, string) ([]RoleAccess, error) {
	out := []RoleAccess{}
	for _, id := range []string{"cargo-a", "cargo-b"} {
		a := f.roles[id]
		out = append(out, RoleAccess{RoleID: id, Name: f.names[id], Create: a.Has(ActionCreate), Edit: a.Has(ActionEdit), Delete: a.Has(ActionDelete)})
	}
	return out, nil
}

func (f *fakeAccess) SetRoleActions(_ context.Context, _, roleID string, a Actions) error {
	if _, ok := f.names[roleID]; !ok {
		return ErrRoleNotFound
	}
	f.roles[roleID] = a
	return nil
}

func TestActionsBitmask(t *testing.T) {
	a := ActionCreate | ActionDelete
	if !a.Has(ActionCreate) || !a.Has(ActionDelete) || a.Has(ActionEdit) {
		t.Fatalf("%b: criar e excluir sim, editar não", a)
	}
	if !a.Has(ActionCreate|ActionDelete) || a.Has(ActionCreate|ActionEdit) {
		t.Fatal("Has com várias ações exige todas")
	}
	if AllActions != 7 {
		t.Fatalf("AllActions = %d, esperava 7 (as três ações)", AllActions)
	}
}

// Cada cargo faz só o que o dono marcou: A só cria, B só edita, C só exclui.
func TestEachActionNeedsItsOwnPermission(t *testing.T) {
	e := newEnv()
	e.access.actions["a"], e.access.actions["b"], e.access.actions["c"] = ActionCreate, ActionEdit, ActionDelete
	ctx := context.Background()

	if _, err := e.svc.Create(ctx, "s1", "b", goodInput()); !errors.Is(err, ErrMissingPermission) {
		t.Errorf("quem só edita não cria: %v", err)
	}
	if _, err := e.svc.Create(ctx, "s1", "c", goodInput()); !errors.Is(err, ErrMissingPermission) {
		t.Errorf("quem só exclui não cria: %v", err)
	}
	created, err := e.svc.Create(ctx, "s1", "a", goodInput())
	if err != nil {
		t.Fatalf("quem pode criar cria: %v", err)
	}

	if _, err := e.svc.Update(ctx, "s1", created.ID, "a", goodInput()); !errors.Is(err, ErrMissingPermission) {
		t.Errorf("quem só cria não edita: %v", err)
	}
	if _, err := e.svc.Update(ctx, "s1", created.ID, "c", goodInput()); !errors.Is(err, ErrMissingPermission) {
		t.Errorf("quem só exclui não edita: %v", err)
	}
	if _, err := e.svc.Update(ctx, "s1", created.ID, "b", goodInput()); err != nil {
		t.Fatalf("quem pode editar edita: %v", err)
	}

	if err := e.svc.Cancel(ctx, "s1", created.ID, "a"); !errors.Is(err, ErrMissingPermission) {
		t.Errorf("quem só cria não exclui: %v", err)
	}
	if err := e.svc.Cancel(ctx, "s1", created.ID, "b"); !errors.Is(err, ErrMissingPermission) {
		t.Errorf("quem só edita não exclui: %v", err)
	}
	if err := e.svc.Cancel(ctx, "s1", created.ID, "c"); err != nil {
		t.Fatalf("quem pode excluir exclui: %v", err)
	}
}

func TestOwnerCanDoEverythingAndMembersWithoutRolesNothing(t *testing.T) {
	e := newEnv()
	ctx := context.Background()
	created, err := e.svc.Create(ctx, "s1", "dono", goodInput())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := e.svc.Update(ctx, "s1", created.ID, "dono", goodInput()); err != nil {
		t.Fatal(err)
	}
	if err := e.svc.Cancel(ctx, "s1", created.ID, "dono"); err != nil {
		t.Fatal(err)
	}
	if _, err := e.svc.Create(ctx, "s1", "membro", goodInput()); !errors.Is(err, ErrMissingPermission) {
		t.Fatalf("membro sem cargo: %v", err)
	}
}

func TestAccessTellsWhatTheMemberCanDo(t *testing.T) {
	e := newEnv()
	e.access.actions["a"] = ActionCreate | ActionEdit
	ctx := context.Background()

	got, err := e.svc.Access(ctx, "s1", "a")
	if err != nil || got != (AccessView{Create: true, Edit: true, Delete: false}) {
		t.Fatalf("a = %+v err=%v", got, err)
	}
	owner, _ := e.svc.Access(ctx, "s1", "dono")
	if owner != (AccessView{Create: true, Edit: true, Delete: true, Owner: true}) {
		t.Fatalf("dono = %+v", owner)
	}
	if _, err := e.svc.Access(ctx, "s1", "estranho"); !errors.Is(err, ErrNotMember) {
		t.Fatalf("não membro = %v", err)
	}
}

func TestOnlyTheOwnerSeesAndChangesTheRoleSettings(t *testing.T) {
	e := newEnv()
	e.access.actions["a"] = AllActions // ter todas as ações num cargo não dá o poder de configurar
	ctx := context.Background()

	if _, err := e.svc.RoleSettings(ctx, "s1", "a"); !errors.Is(err, ErrOwnerOnly) {
		t.Fatalf("ver a configuração: %v", err)
	}
	if err := e.svc.SetRoleActions(ctx, "s1", "a", "cargo-a", ActionEdit); !errors.Is(err, ErrOwnerOnly) {
		t.Fatalf("mudar a configuração: %v", err)
	}
	if len(e.pub.sent) != 0 {
		t.Fatalf("nada devia ser publicado: %+v", e.pub.sent)
	}

	if err := e.svc.SetRoleActions(ctx, "s1", "dono", "cargo-a", ActionCreate|ActionEdit); err != nil {
		t.Fatal(err)
	}
	roles, err := e.svc.RoleSettings(ctx, "s1", "dono")
	if err != nil || len(roles) != 2 {
		t.Fatalf("cargos = %+v err=%v", roles, err)
	}
	if !roles[0].Create || !roles[0].Edit || roles[0].Delete || roles[1].Create {
		t.Fatalf("configuração = %+v", roles)
	}
}

func TestChangingTheRoleSettingsTellsTheApp(t *testing.T) {
	e := newEnv()
	if err := e.svc.SetRoleActions(context.Background(), "s1", "dono", "cargo-a", ActionDelete); err != nil {
		t.Fatal(err)
	}
	last := e.pub.sent[len(e.pub.sent)-1]
	if last.room != "server:s1" || last.event["type"] != "event:access" {
		t.Fatalf("publicado = %+v, esperava event:access", last)
	}
}

func TestSetRoleActionsUnknownRole(t *testing.T) {
	e := newEnv()
	if err := e.svc.SetRoleActions(context.Background(), "s1", "dono", "outro", ActionEdit); !errors.Is(err, ErrRoleNotFound) {
		t.Fatalf("erro = %v", err)
	}
}
