package user

import (
	"context"
	"errors"
	"testing"
)

// fakeVerified responde se a conta confirmou o e-mail e conta as idas ao banco.
type fakeVerified struct {
	verified map[string]bool
	calls    int
	err      error
	// during roda no meio da consulta (para simular uma escrita concorrente).
	during func()
}

func (f *fakeVerified) lookup(_ context.Context, id string) (bool, error) {
	f.calls++
	ok := f.verified[id]
	if f.during != nil {
		f.during()
	}
	return ok, f.err
}

func TestVerifiedIsCachedAfterTheFirstYes(t *testing.T) {
	f := &fakeVerified{verified: map[string]bool{"ana": true}}
	c := newVerifiedCache(f.lookup)
	for range 3 {
		ok, err := c.IsVerified(context.Background(), "ana")
		if err != nil || !ok {
			t.Fatalf("IsVerified = %v, %v", ok, err)
		}
	}
	if f.calls != 1 {
		t.Fatalf("consultou %d vezes, queria 1", f.calls)
	}
}

func TestNotVerifiedAndErrorsAreNotCached(t *testing.T) {
	f := &fakeVerified{verified: map[string]bool{}}
	c := newVerifiedCache(f.lookup)
	ctx := context.Background()
	if ok, _ := c.IsVerified(ctx, "bia"); ok {
		t.Fatal("bia não confirmou")
	}
	f.verified["bia"] = true // confirmou pelo link
	if ok, _ := c.IsVerified(ctx, "bia"); !ok {
		t.Fatal("confirmou: a próxima checagem já vê")
	}

	f.err = errors.New("banco fora")
	if _, err := c.IsVerified(ctx, "caio"); err == nil {
		t.Fatal("queria o erro")
	}
	f.err = nil
	f.verified["caio"] = true
	if ok, err := c.IsVerified(ctx, "caio"); err != nil || !ok {
		t.Fatalf("depois do erro: %v, %v", ok, err)
	}
}

func TestForgetMakesTheNextCheckGoToTheDatabase(t *testing.T) {
	f := &fakeVerified{verified: map[string]bool{"ana": true}}
	c := newVerifiedCache(f.lookup)
	ctx := context.Background()
	_, _ = c.IsVerified(ctx, "ana")

	f.verified["ana"] = false // trocou o e-mail: volta a não confirmado
	c.Forget("ana")
	if ok, _ := c.IsVerified(ctx, "ana"); ok {
		t.Fatal("depois de trocar o e-mail, não está confirmado")
	}
}

// Uma consulta que começou antes da troca de e-mail não pode gravar o "sim"
// velho depois do Forget.
func TestForgetDuringLookupWins(t *testing.T) {
	f := &fakeVerified{verified: map[string]bool{"ana": true}}
	c := newVerifiedCache(f.lookup)
	f.during = func() {
		f.during = nil
		f.verified["ana"] = false
		c.Forget("ana")
	}
	_, _ = c.IsVerified(context.Background(), "ana")

	if ok, _ := c.IsVerified(context.Background(), "ana"); ok {
		t.Fatal("o sim velho ficou no cache")
	}
}
