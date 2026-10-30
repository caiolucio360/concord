package level

import (
	"context"
	"errors"
	"testing"

	"gin-quickstart/backend/internal/relationship"
)

// fakeLinks: vínculo de cada quem-vê com cada pessoa; o que falta é sem vínculo.
type fakeLinks struct {
	kinds map[string]map[string]relationship.Kind
	err   error
}

func (f *fakeLinks) Of(_ context.Context, viewerID string, userIDs []string) (map[string]relationship.Kind, error) {
	if f.err != nil {
		return nil, f.err
	}
	out := map[string]relationship.Kind{}
	for _, id := range userIDs {
		if k, ok := f.kinds[viewerID][id]; ok {
			out[id] = k
		}
	}
	return out, nil
}

func privacyTop() []RankingEntry {
	return []RankingEntry{
		{UserID: "ana", Username: "ana_123", DisplayName: "Ana", XP: 900},
		{UserID: "bia", Username: "bia_456", DisplayName: "Bia", XP: 800},
	}
}

func byID(entries []RankingEntry) map[string]RankingEntry {
	out := map[string]RankingEntry{}
	for _, e := range entries {
		out[e.UserID] = e
	}
	return out
}

func TestRankingSemVinculoNaoMostraUsername(t *testing.T) {
	s, _ := newRankingTest(&fakeRankingStore{top: privacyTop()})
	s.links = &fakeLinks{kinds: map[string]map[string]relationship.Kind{"eu": {"ana": relationship.Friend}}}

	got, err := s.Get(context.Background(), "eu", 100)
	if err != nil {
		t.Fatal(err)
	}
	e := byID(got.Entries)
	if e["ana"].Username != "ana_123" || e["ana"].Relationship != relationship.Friend {
		t.Errorf("amiga = %+v, quer o @ e friend", e["ana"])
	}
	if e["bia"].Username != "" || e["bia"].Relationship != relationship.None {
		t.Errorf("sem vínculo = %+v, quer sem @ e none", e["bia"])
	}
	if e["bia"].DisplayName != "Bia" {
		t.Errorf("nome de exibição some: %+v", e["bia"])
	}
}

// O top é um cache só para todos: o filtro de quem pede não pode vazar nem
// apagar o @ para o próximo.
func TestRankingFiltroDepoisDoCache(t *testing.T) {
	store := &fakeRankingStore{top: privacyTop()}
	s, _ := newRankingTest(store)
	s.links = &fakeLinks{kinds: map[string]map[string]relationship.Kind{
		"colega": {"ana": relationship.SharedServer, "bia": relationship.SharedServer},
	}}
	ctx := context.Background()

	estranho, _ := s.Get(ctx, "estranho", 100)
	colega, _ := s.Get(ctx, "colega", 100)
	estranhoDeNovo, _ := s.Get(ctx, "estranho", 100)

	if store.topCalls != 1 {
		t.Errorf("consultas ao top = %d, quer 1 (cache)", store.topCalls)
	}
	if byID(estranho.Entries)["ana"].Username != "" || byID(estranhoDeNovo.Entries)["bia"].Username != "" {
		t.Error("estranho viu o @")
	}
	if c := byID(colega.Entries); c["ana"].Username != "ana_123" || c["bia"].Username != "bia_456" {
		t.Errorf("colega de servidor perdeu o @: %+v", colega.Entries)
	}
}

func TestRankingErroNoVinculoEhErro(t *testing.T) {
	s, _ := newRankingTest(&fakeRankingStore{top: privacyTop()})
	s.links = &fakeLinks{err: errors.New("banco fora")}

	if _, err := s.Get(context.Background(), "eu", 100); err == nil {
		t.Fatal("quer erro: sem saber o vínculo, não dá para mostrar o @")
	}
}
