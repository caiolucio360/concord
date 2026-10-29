package server

import "context"

// Entrada de membros no servidor (cadastro em server_members).

func (r *Repository) AddingUserServer(
	ctx context.Context,
	server *Server,
	serverMember *ServerMember,
	userID string,
	role string,
) error {
	return r.db.QueryRow(
		ctx,
		`
		INSERT INTO server_members (
			server_id,
			user_id,
			role
		)
		VALUES ($1, $2, $3)
		RETURNING
			server_id,
			user_id,
			role,
			joined_at,
			updated_at
		`,
		server.ID,
		userID,
		role,
	).Scan(
		&serverMember.ServerID,
		&serverMember.UserID,
		&serverMember.Role,
		&serverMember.JoinedAt,
		&serverMember.UpdatedAt,
	)
}

// AddMemberIfMissing põe alguém no servidor sem falhar se já estiver lá.
// Se o usuário for um bot (is_bot = TRUE), vincula também o cargo de sistema (Bots).
func (r *Repository) AddMemberIfMissing(ctx context.Context, serverID string, userID string, role string) error {
	if _, err := r.db.Exec(ctx,
		`INSERT INTO server_members (server_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
		serverID, userID, role); err != nil {
		return err
	}
	_, err := r.db.Exec(ctx,
		`INSERT INTO member_roles (server_id, user_id, role_id)
		 SELECT $1, $2, r.id
		 FROM roles r
		 JOIN users u ON u.id = $2
		 WHERE r.server_id = $1 AND r.is_system = TRUE AND u.is_bot = TRUE
		 ON CONFLICT DO NOTHING`,
		serverID, userID)
	return err
}
