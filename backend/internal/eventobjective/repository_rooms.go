package eventobjective

import "context"

// RunningRooms lista as salas abertas dos eventos vivos que têm objetivos, com
// quem disse Vou na ocorrência atual e os objetivos de cada um.
func (r *Repository) RunningRooms(ctx context.Context) ([]Room, error) {
	rows, err := r.db.Query(ctx, `
		SELECT e.id, e.server_id, e.voice_channel_id, e.next_start_at, COALESCE(e.game_name, '')
		FROM server_events e
		WHERE e.voice_channel_id IS NOT NULL AND e.canceled_at IS NULL AND e.finished_at IS NULL
		  AND EXISTS (SELECT 1 FROM event_objectives o WHERE o.event_id = e.id)`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var rooms []Room
	for rows.Next() {
		room := Room{Going: map[string]bool{}}
		if err := rows.Scan(&room.EventID, &room.ServerID, &room.ChannelID, &room.Occurrence, &room.Game); err != nil {
			return nil, err
		}
		rooms = append(rooms, room)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return rooms, r.fillRooms(ctx, rooms)
}

// fillRooms completa cada sala com os objetivos e com quem disse Vou.
func (r *Repository) fillRooms(ctx context.Context, rooms []Room) error {
	for i := range rooms {
		if err := r.fillObjectives(ctx, &rooms[i]); err != nil {
			return err
		}
		if err := r.fillGoing(ctx, &rooms[i]); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) fillObjectives(ctx context.Context, room *Room) error {
	rows, err := r.db.Query(ctx, `
		SELECT id, kind, difficulty, minutes FROM event_objectives WHERE event_id = $1 ORDER BY position`, room.EventID)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var o RoomObjective
		var kind, difficulty string
		if err := rows.Scan(&o.ID, &kind, &difficulty, &o.Minutes); err != nil {
			return err
		}
		o.Kind, o.Difficulty = Kind(kind), Difficulty(difficulty)
		room.Objectives = append(room.Objectives, o)
	}
	return rows.Err()
}

func (r *Repository) fillGoing(ctx context.Context, room *Room) error {
	rows, err := r.db.Query(ctx, `
		SELECT user_id FROM event_rsvps WHERE event_id = $1 AND occurrence_start = $2 AND going`,
		room.EventID, room.Occurrence)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return err
		}
		room.Going[id] = true
	}
	return rows.Err()
}
