package eventobjective

import "encoding/json"

// ProgressEvent é o aviso `event:objective` que a pessoa recebe a cada minuto
// de progresso e ao cumprir.
type ProgressEvent struct {
	ServerID    string `json:"server_id"`
	EventID     string `json:"event_id"`
	ObjectiveID string `json:"objective_id"`
	Minutes     int    `json:"minutes"`
	Done        bool   `json:"done"`
	// XP: o XP pessoal pago agora (0 enquanto não cumpriu).
	XP     int64 `json:"xp"`
	Capped bool  `json:"capped"`
}

func marshalEvent(typ string, payload any) []byte {
	data, err := json.Marshal(map[string]any{"type": typ, "payload": payload})
	if err != nil {
		return nil
	}
	return data
}
