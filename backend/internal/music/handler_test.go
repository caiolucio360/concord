package music

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func enqueueRequest(t *testing.T, m *Manager, body string) *httptest.ResponseRecorder {
	t.Helper()
	gin.SetMode(gin.TestMode)
	r := gin.New()
	auth := func(c *gin.Context) { c.Set("userID", "u1") }
	Routes(r.Group("/api"), NewHandler(m, nil), auth)
	req := httptest.NewRequest(http.MethodPost, "/api/servers/srv1/music/enqueue", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestEnqueueHandlerStatuses(t *testing.T) {
	cases := []struct {
		name    string
		inVoice bool
		body    string
		status  int
		contain string
	}{
		{"ok", true, `{"query":"queen - bohemian"}`, http.StatusNoContent, ""},
		{"fora da voz", false, `{"query":"queen"}`, http.StatusUnprocessableEntity, TextNotInVoice},
		{"busca vazia", true, `{"query":"  "}`, http.StatusBadRequest, ErrInvalidQuery.Error()},
		{"json ruim", true, `{`, http.StatusBadRequest, "invalid request"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			m, _ := newTestManager(t, tc.inVoice, true)
			w := enqueueRequest(t, m, tc.body)
			if w.Code != tc.status || !strings.Contains(w.Body.String(), tc.contain) {
				t.Fatalf("%d %s, want %d com %q", w.Code, w.Body.String(), tc.status, tc.contain)
			}
		})
	}
}
