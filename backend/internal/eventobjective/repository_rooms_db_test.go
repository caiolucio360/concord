package eventobjective

import (
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// seedVoiceChannel cria um canal de voz no servidor.
func seedVoiceChannel(t *testing.T, db *pgxpool.Pool, serverID, userID string) string {
	t.Helper()
	id := uuid.NewString()
	mustExec(t, db, `INSERT INTO channels (id, server_id, name, created_by, type) VALUES ($1, $2, $3, $4, 'voice')`,
		id, serverID, "canal-"+id[:8], userID)
	return id
}

// seedMember cria outra pessoa no servidor.
func seedMember(t *testing.T, db *pgxpool.Pool, serverID string) string {
	t.Helper()
	id := uuid.NewString()
	mustExec(t, db, `INSERT INTO users (id, username, display_name, email, password_hash, email_verified_at)
		VALUES ($1, $2, $2, $3, 'x', NOW())`, id, "m"+id[:8], id[:8]+"@teste.dev")
	mustExec(t, db, `INSERT INTO server_members (server_id, user_id) VALUES ($1, $2)`, serverID, id)
	t.Cleanup(func() { mustExec(t, db, `DELETE FROM users WHERE id = $1`, id) })
	return id
}

func roomOf(rooms []Room, eventID string) (Room, bool) {
	for _, r := range rooms {
		if r.EventID == eventID {
			return r, true
		}
	}
	return Room{}, false
}

func TestRunningRoomsListsOpenRoomsWithObjectivesAndWhoIsGoing(t *testing.T) {
	db, ctx := testDB(t)
	repo := NewRepository(db)
	owner, serverID, eventID := seedEvent(t, db)
	other := seedMember(t, db, serverID)
	channel := seedVoiceChannel(t, db, serverID, owner)
	replace(t, db, eventID, []Input{{KindTime, Easy, 30}, {KindGame, Hard, 60}})

	// Sem sala aberta ainda: não aparece.
	rooms, err := repo.RunningRooms(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := roomOf(rooms, eventID); ok {
		t.Fatal("evento sem sala aberta não deveria aparecer")
	}

	mustExec(t, db, `UPDATE server_events SET voice_channel_id = $2, game_name = 'Minecraft' WHERE id = $1`, eventID, channel)
	for user, going := range map[string]bool{owner: true, other: false} {
		mustExec(t, db, `INSERT INTO event_rsvps (event_id, user_id, occurrence_start, going)
			VALUES ($1, $2, (SELECT next_start_at FROM server_events WHERE id = $1), $3)`, eventID, user, going)
	}
	rooms, err = repo.RunningRooms(ctx)
	if err != nil {
		t.Fatal(err)
	}
	room, ok := roomOf(rooms, eventID)
	if !ok {
		t.Fatal("a sala aberta com objetivos deveria aparecer")
	}
	if room.ChannelID != channel || room.ServerID != serverID || room.Game != "Minecraft" {
		t.Errorf("sala = %+v", room)
	}
	if !room.Going[owner] || room.Going[other] || len(room.Going) != 1 {
		t.Errorf("só quem disse Vou entra em Going: %v", room.Going)
	}
	if len(room.Objectives) != 2 || room.Objectives[0].Kind != KindTime || room.Objectives[1].Difficulty != Hard ||
		room.Objectives[1].Minutes != 60 || room.Objectives[0].ID == "" {
		t.Errorf("objetivos = %+v", room.Objectives)
	}

	// Cancelado, ou sem objetivos, deixa de aparecer.
	mustExec(t, db, `UPDATE server_events SET canceled_at = NOW() WHERE id = $1`, eventID)
	rooms, _ = repo.RunningRooms(ctx)
	if _, ok := roomOf(rooms, eventID); ok {
		t.Error("evento cancelado não pontua")
	}
	mustExec(t, db, `UPDATE server_events SET canceled_at = NULL WHERE id = $1`, eventID)
	replace(t, db, eventID, nil)
	rooms, _ = repo.RunningRooms(ctx)
	if _, ok := roomOf(rooms, eventID); ok {
		t.Error("evento sem objetivos não precisa de sala vigiada")
	}
}

func TestRunningRoomsWithoutAGameHasAnEmptyGame(t *testing.T) {
	db, ctx := testDB(t)
	owner, serverID, eventID := seedEvent(t, db)
	channel := seedVoiceChannel(t, db, serverID, owner)
	replace(t, db, eventID, []Input{{KindTime, Easy, 15}})
	mustExec(t, db, `UPDATE server_events SET voice_channel_id = $2 WHERE id = $1`, eventID, channel)

	rooms, err := NewRepository(db).RunningRooms(ctx)
	if err != nil {
		t.Fatal(err)
	}
	room, ok := roomOf(rooms, eventID)
	if !ok || room.Game != "" {
		t.Fatalf("sala = %+v (%v)", room, ok)
	}
}
