package serverlevel

import "testing"

// A fonte "evento" (objetivos de eventos) entra no detalhamento, mas não é de
// tempo: não rende por minuto de call, só por objetivo cumprido.
func TestEventSourceIsListedButIsNotATimeSource(t *testing.T) {
	if SourceEvent != "evento" {
		t.Fatalf("SourceEvent = %q, o banco usa \"evento\" (server_level_cap)", SourceEvent)
	}
	found := false
	for _, s := range Sources {
		found = found || s == SourceEvent
	}
	if !found {
		t.Errorf("Sources = %v, deveria listar %q", Sources, SourceEvent)
	}
	if _, isTime := xpPerMinute[SourceEvent]; isTime {
		t.Error("evento não é fonte de tempo")
	}
}
