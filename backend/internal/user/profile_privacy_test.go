package user

import (
	"encoding/json"
	"errors"
	"net/http"
	"testing"

	"gin-quickstart/backend/internal/relationship"
)

func getProfile(t *testing.T, e *profileEnv, id string) (int, PublicProfile) {
	t.Helper()
	rec := e.do(t, http.MethodGet, "/api/users/"+id+"/profile", nil, "")
	var p PublicProfile
	json.Unmarshal(rec.Body.Bytes(), &p)
	return rec.Code, p
}

// Quem chega pelo ranking sem amizade nem servidor em comum vê o nome de
// exibição e a customização, mas não o @.
func TestGetProfileSemVinculoEscondeUsername(t *testing.T) {
	e := newProfileEnv(t)
	e.links.kinds[otherID] = relationship.None
	e.repo.users[otherID].Bio = "oi"

	code, p := getProfile(t, e, otherID)
	if code != http.StatusOK {
		t.Fatalf("status = %d", code)
	}
	if p.Username != "" || p.Relationship != relationship.None {
		t.Errorf("sem vínculo: username = %q, relationship = %q", p.Username, p.Relationship)
	}
	if p.DisplayName != "Baal" || p.Bio != "oi" {
		t.Errorf("nome de exibição e Sobre mim ficam: %+v", p)
	}
}

func TestGetProfileComVinculoMostraUsername(t *testing.T) {
	for _, k := range []relationship.Kind{relationship.Friend, relationship.SharedServer} {
		e := newProfileEnv(t)
		e.links.kinds[otherID] = k
		_, p := getProfile(t, e, otherID)
		if p.Username != "baal" || p.Relationship != k {
			t.Errorf("%s: username = %q, relationship = %q", k, p.Username, p.Relationship)
		}
	}
}

func TestGetProfileProprioEhSelf(t *testing.T) {
	e := newProfileEnv(t)
	_, p := getProfile(t, e, meID)
	if p.Username != "mugis" || p.Relationship != relationship.Self {
		t.Errorf("próprio perfil: username = %q, relationship = %q", p.Username, p.Relationship)
	}
}

func TestGetProfileErroNoVinculoNaoEntregaOPerfil(t *testing.T) {
	e := newProfileEnv(t)
	e.links.err = errors.New("banco fora")
	if code, p := getProfile(t, e, otherID); code == http.StatusOK || p.Username != "" {
		t.Errorf("status = %d, username = %q; quer erro sem o @", code, p.Username)
	}
}

// O evento user:update vai para todo mundo conectado e não leva vínculo.
func TestPublishUserUpdateSemRelationship(t *testing.T) {
	e := newProfileEnv(t)
	e.do(t, http.MethodPut, "/api/users/me/profile", []byte(`{"display_name":"Mugis","links":[]}`), "application/json")
	if len(e.events.published) != 1 || e.events.published[0].Relationship != "" {
		t.Errorf("eventos = %+v", e.events.published)
	}
}
