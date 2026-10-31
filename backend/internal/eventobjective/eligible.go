package eventobjective

import (
	"strings"
	"time"

	"gin-quickstart/backend/internal/call"
)

// RoomObjective é o objetivo de um evento como a sala o vê.
type RoomObjective struct {
	ID         string
	Kind       Kind
	Minutes    int
	Difficulty Difficulty
}

// Room é a sala aberta de um evento em andamento, com quem disse Vou na
// ocorrência atual e os objetivos.
type Room struct {
	EventID, ServerID string
	ChannelID         string
	Occurrence        time.Time
	// Game: o jogo do evento ("" = sem jogo).
	Game       string
	Going      map[string]bool
	Objectives []RoomObjective
}

// Target é o objetivo de uma ocorrência: o que o tracker soma e o pagamento usa.
type Target struct {
	ObjectiveID, EventID, ServerID, CallID string
	Occurrence                             time.Time
	Minutes                                int
	Difficulty                             Difficulty
}

// Contribution é "esta pessoa conta tempo neste objetivo agora".
type Contribution struct {
	UserID string
	Target Target
}

// Contributions diz quem pontua em cada objetivo neste instante: está em Voice
// na call da sala do evento (já sem mute, surdez, call sozinho e AFK), tem Vou,
// é conta real e, no objetivo de jogo, a atividade dela é o jogo do evento.
// rooms vem indexado pelo id do canal de voz.
func Contributions(snaps []call.CallSnapshot, rooms map[string]Room, real map[string]bool, gameOf func(userID string) string) []Contribution {
	var out []Contribution
	for _, s := range snaps {
		if s.ChannelID == nil {
			continue
		}
		room, ok := rooms[*s.ChannelID]
		if !ok {
			continue
		}
		for _, userID := range s.Voice {
			if !real[userID] || !room.Going[userID] {
				continue
			}
			out = append(out, personContributions(room, s.CallID, userID, gameOf)...)
		}
	}
	return out
}

func personContributions(room Room, callID, userID string, gameOf func(string) string) []Contribution {
	var out []Contribution
	for _, o := range room.Objectives {
		if o.Kind == KindGame && !sameGame(gameOf(userID), room.Game) {
			continue
		}
		out = append(out, Contribution{UserID: userID, Target: Target{
			ObjectiveID: o.ID, EventID: room.EventID, ServerID: room.ServerID, CallID: callID,
			Occurrence: room.Occurrence, Minutes: o.Minutes, Difficulty: o.Difficulty,
		}})
	}
	return out
}

// sameGame compara o jogo da atividade com o do evento sem ligar para
// maiúsculas, acentos e espaços nas pontas (a mesma regra do selo "Jogando" do
// app). Feito à mão para não puxar golang.org/x/text como dependência direta.
func sameGame(activityName, eventGame string) bool {
	a, b := foldGame(activityName), foldGame(eventGame)
	return a != "" && a == b
}

var accentFold = strings.NewReplacer(
	"á", "a", "à", "a", "â", "a", "ã", "a", "ä", "a",
	"é", "e", "è", "e", "ê", "e", "ë", "e",
	"í", "i", "ì", "i", "î", "i", "ï", "i",
	"ó", "o", "ò", "o", "ô", "o", "õ", "o", "ö", "o",
	"ú", "u", "ù", "u", "û", "u", "ü", "u", "ç", "c", "ñ", "n",
)

func foldGame(name string) string {
	return accentFold.Replace(strings.ToLower(strings.TrimSpace(name)))
}
