package changelog

import (
	"encoding/json"
	"net/http"
	"reflect"
	"strings"
	"testing"
)

func rel(version string, entries ...Entry) Release {
	if entries == nil {
		entries = []Entry{}
	}
	return Release{Version: version, Entries: entries}
}

func note(source, text string) Entry { return Entry{Kind: KindFeature, Source: source, Text: text} }

func notesBody(entries ...Entry) string {
	b, _ := json.Marshal(Publication{Entries: entries})
	return string(b)
}

func publish(t *testing.T, st *fakeStore, version string, entries ...Entry) []Entry {
	t.Helper()
	w := serve(t, st, "tok", http.MethodPut, "/api/changelog/"+version, "tok", notesBody(entries...), false)
	if w.Code != http.StatusNoContent {
		t.Fatalf("status = %d: %s", w.Code, w.Body.String())
	}
	return st.upserts[version].Entries
}

// Regressão 0.6.33–0.6.45: cada deploy republicava as notas acumuladas numa
// versão nova. Agora a identidade da nota é o arquivo de origem.
func TestPublishDropsSourcesFromEarlierReleases(t *testing.T) {
	st := &fakeStore{releases: []Release{
		rel("0.6.44", note("a.md", "A"), note("b.md", "B")),
		rel("0.6.41", note("c.md", "C")),
	}}
	got := publish(t, st, "0.6.45", note("a.md", "A"), note("b.md", "B"), note("c.md", "C"), note("d.md", "D"))
	if want := []Entry{note("d.md", "D")}; !reflect.DeepEqual(got, want) {
		t.Fatalf("entradas = %+v", got)
	}
}

// Regressão: reescrever uma nota já publicada fazia ela sair de novo como nova,
// porque a comparação era pelo texto.
func TestPublishRewordedNoteDoesNotComeBack(t *testing.T) {
	st := &fakeStore{releases: []Release{rel("0.6.44", note("a.md", "Texto antigo"))}}
	got := publish(t, st, "0.6.45", note("a.md", "Texto reescrito"))
	if len(got) != 0 {
		t.Fatalf("entradas = %+v", got)
	}
}

// Repetir o deploy da mesma versão mantém as notas dela (só as mais antigas contam).
func TestPublishSameVersionAgainKeepsItsOwnNotes(t *testing.T) {
	st := &fakeStore{releases: []Release{
		rel("0.6.46", note("z.md", "Z")),
		rel("0.6.45", note("d.md", "D")),
		rel("0.6.44", note("a.md", "A")),
	}}
	got := publish(t, st, "0.6.45", note("a.md", "A"), note("d.md", "D"))
	if want := []Entry{note("d.md", "D")}; !reflect.DeepEqual(got, want) {
		t.Fatalf("entradas = %+v", got)
	}
}

// Regressão: a mesma nota duas vezes no envio saía duplicada na tela.
func TestPublishDropsDuplicatesWithinTheSameBatch(t *testing.T) {
	st := &fakeStore{}
	got := publish(t, st, "0.6.45", note("a.md", "A"), note("a.md", "A"), note("b.md", "A"))
	if want := []Entry{note("a.md", "A"), note("b.md", "A")}; !reflect.DeepEqual(got, want) {
		t.Fatalf("entradas = %+v", got)
	}
}

// Regressão: a release instalada sumia da lista quando ficava sem notas, e o
// usuário não via "onde estou".
func TestListKeepsReleasesWithoutNotes(t *testing.T) {
	withSummary := rel("0.6.2")
	withSummary.Summary = "Primeira versão"
	st := &fakeStore{releases: []Release{rel("0.6.35"), rel("0.6.33", note("a.md", "A")), withSummary}}
	w := serve(t, st, "tok", http.MethodGet, "/api/changelog", "", "", true)
	var got []Release
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if len(got) != 3 || got[0].Version != "0.6.35" {
		t.Fatalf("releases = %+v", got)
	}
}

// O arquivo de origem é detalhe do deploy: quem lê o changelog não o recebe.
func TestListDoesNotExposeSources(t *testing.T) {
	st := &fakeStore{releases: []Release{rel("0.6.33", note("2026-10-30-badges.md", "A"))}}
	w := serve(t, st, "tok", http.MethodGet, "/api/changelog", "", "", true)
	if strings.Contains(w.Body.String(), "badges.md") {
		t.Fatalf("corpo expõe a origem: %s", w.Body.String())
	}
}

func TestPublishRejectsLongSource(t *testing.T) {
	w := serve(t, &fakeStore{}, "tok", http.MethodPut, "/api/changelog/0.6.45", "tok",
		notesBody(note(strings.Repeat("a", maxSource+1), "A")), false)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d", w.Code)
	}
}
