package soundboard

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// fakeVisitors: "visita" tem acesso de visitante na call de srv-1.
type fakeVisitors struct{}

func (fakeVisitors) HasGuestPass(serverID, userID string) bool {
	return serverID == "srv-1" && userID == "visita"
}

// A mesa da call: membro e visitante na call do servidor veem os sons; quem é
// de fora, não (docs/adr/0017-visitante-na-call.md).
func TestListSoundsForMembersAndVisitors(t *testing.T) {
	r, h, repo, _ := setupTestRouter(t)
	h.SetVisitors(fakeVisitors{})
	repo.sounds["s1"] = Sound{ID: "s1", ServerID: "srv-1", Name: "Buzina"}

	cases := []struct {
		name, server, user string
		want               int
	}{
		{"membro", "srv-1", "user-1", http.StatusOK},
		{"visitante na call do servidor", "srv-1", "visita", http.StatusOK},
		{"visitante noutro servidor", "srv-2", "visita", http.StatusForbidden},
		{"de fora", "srv-1", "outsider", http.StatusForbidden},
		{"sem login", "srv-1", "", http.StatusUnauthorized},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/servers/"+tc.server+"/soundboard", nil)
			if tc.user != "" {
				req.Header.Set("X-User-ID", tc.user)
			}
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if w.Code != tc.want {
				t.Fatalf("status = %d, want %d (%s)", w.Code, tc.want, w.Body.String())
			}
		})
	}
}
