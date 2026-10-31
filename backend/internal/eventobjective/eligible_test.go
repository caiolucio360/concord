package eventobjective

import (
	"testing"
	"time"

	"gin-quickstart/backend/internal/call"
)

func ptr(s string) *string { return &s }

// roomFor monta a sala de um evento com um objetivo de tempo e um de jogo.
func roomFor(channel, game string, going ...string) Room {
	g := map[string]bool{}
	for _, id := range going {
		g[id] = true
	}
	return Room{
		EventID: "ev1", ServerID: "s1", ChannelID: channel,
		Occurrence: time.Date(2026, 12, 1, 20, 0, 0, 0, time.UTC),
		Game:       game, Going: g,
		Objectives: []RoomObjective{
			{ID: "o-time", Kind: KindTime, Minutes: 30, Difficulty: Easy},
			{ID: "o-game", Kind: KindGame, Minutes: 30, Difficulty: Hard},
		},
	}
}

func idsOf(cs []Contribution) map[string]bool {
	out := map[string]bool{}
	for _, c := range cs {
		out[c.UserID+"/"+c.Target.ObjectiveID] = true
	}
	return out
}

func TestContributionsOnlyForEligibleGoingRealPeopleInTheRoom(t *testing.T) {
	snaps := []call.CallSnapshot{
		{CallID: "c1", ChannelID: ptr("voz"), Voice: []string{"ana", "bia", "caio", "dan"}},
		{CallID: "c2", ChannelID: ptr("outra"), Voice: []string{"ana"}},
		{CallID: "c3", Voice: []string{"ana"}}, // DM
	}
	rooms := map[string]Room{"voz": roomFor("voz", "Minecraft", "ana", "bia", "dan")}
	real := map[string]bool{"ana": true, "bia": true, "caio": true} // dan não é conta real
	games := map[string]string{"ana": "minecraft", "bia": "Valorant"}
	got := idsOf(Contributions(snaps, rooms, real, func(u string) string { return games[u] }))

	for _, want := range []string{"ana/o-time", "ana/o-game", "bia/o-time"} {
		if !got[want] {
			t.Errorf("faltou %s em %v", want, got)
		}
	}
	for _, bad := range []string{"bia/o-game", "caio/o-time", "caio/o-game", "dan/o-time"} {
		if got[bad] {
			t.Errorf("não deveria contar %s", bad)
		}
	}
	if len(got) != 3 {
		t.Errorf("contribuições = %v", got)
	}
}

// Voice já vem sem quem está AFK, mutado, surdo ou sozinho na call.
func TestContributionsSkipWhoIsNotInVoice(t *testing.T) {
	snaps := []call.CallSnapshot{{
		CallID: "c1", ChannelID: ptr("voz"), Voice: []string{"ana"},
		Participants: []string{"ana", "bia"}, Away: []string{"bia"},
	}}
	rooms := map[string]Room{"voz": roomFor("voz", "", "ana", "bia")}
	got := idsOf(Contributions(snaps, rooms, map[string]bool{"ana": true, "bia": true}, func(string) string { return "" }))
	if got["bia/o-time"] || !got["ana/o-time"] {
		t.Errorf("contribuições = %v", got)
	}
}

func TestContributionsCarryTheTarget(t *testing.T) {
	snaps := []call.CallSnapshot{{CallID: "c1", ChannelID: ptr("voz"), Voice: []string{"ana"}}}
	room := roomFor("voz", "", "ana")
	got := Contributions(snaps, map[string]Room{"voz": room}, map[string]bool{"ana": true}, func(string) string { return "" })
	if len(got) != 1 {
		t.Fatalf("contribuições = %+v", got)
	}
	want := Target{
		ObjectiveID: "o-time", EventID: "ev1", ServerID: "s1", CallID: "c1",
		Occurrence: room.Occurrence, Minutes: 30, Difficulty: Easy,
	}
	if got[0].Target != want {
		t.Errorf("alvo = %+v, esperava %+v", got[0].Target, want)
	}
}

func TestSameGameIgnoresCaseAccentsAndEdgeSpaces(t *testing.T) {
	cases := []struct {
		activity, event string
		want            bool
	}{
		{"Minecraft", "minecraft", true},
		{"  Counter-Strike 2 ", "counter-strike 2", true},
		{"Pokémon", "pokemon", true},
		{"Valorant", "Minecraft", false},
		{"", "Minecraft", false},
		{"Minecraft", "", false},
		{"", "", false},
	}
	for _, c := range cases {
		if got := sameGame(c.activity, c.event); got != c.want {
			t.Errorf("sameGame(%q, %q) = %v", c.activity, c.event, got)
		}
	}
}
