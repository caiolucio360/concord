package emoji

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
)

// DefaultBaseURL: o pack base vem do emojibase (MIT) no jsDelivr, em
// português. A versão é fixa, então o conteúdo nunca muda: busca uma vez por
// processo e guarda sem prazo. Trocar a versão é um deploy (ADR 0028).
const DefaultBaseURL = "https://cdn.jsdelivr.net/npm/emojibase-data@16.0.3/pt"

// componentGroup: tons de pele e cabelos soltos, que não são emojis de usar.
const componentGroup = 2

// BaseEmoji: um emoji do pack base, já enxuto para o app (chaves curtas: o
// pack tem ~1.900 emojis).
type BaseEmoji struct {
	Emoji    string   `json:"e"`
	Label    string   `json:"l"`
	Keywords []string `json:"k,omitempty"`
	Group    int      `json:"g"`
}

type BaseGroup struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type BasePack struct {
	Groups []BaseGroup `json:"groups"`
	Emojis []BaseEmoji `json:"emojis"`
}

// basePayload: o pack já serializado, pronto para escrever na resposta.
type basePayload struct {
	body []byte
	etag string
}

type BaseService struct {
	baseURL string
	client  *http.Client
	ready   atomic.Pointer[basePayload]
	loading sync.Mutex
}

func NewBaseService(baseURL string) *BaseService {
	return &BaseService{baseURL: baseURL, client: &http.Client{Timeout: 15 * time.Second}}
}

// Warm busca o pack em segundo plano no boot, para o primeiro pedido já sair
// da memória. Se falhar, o primeiro pedido tenta de novo.
func (s *BaseService) Warm() {
	go func() { _, _, _ = s.Payload(context.Background()) }()
}

// Payload devolve o JSON do pack e o ETag. Depois de carregado é só uma
// leitura atômica; pedidos simultâneos antes disso esperam uma busca só.
func (s *BaseService) Payload(ctx context.Context) ([]byte, string, error) {
	if p := s.ready.Load(); p != nil {
		return p.body, p.etag, nil
	}
	s.loading.Lock()
	defer s.loading.Unlock()
	if p := s.ready.Load(); p != nil {
		return p.body, p.etag, nil
	}
	p, err := s.fetch(ctx)
	if err != nil {
		return nil, "", err
	}
	s.ready.Store(p)
	return p.body, p.etag, nil
}

type rawEmoji struct {
	Group   *int     `json:"group"`
	Label   string   `json:"label"`
	Order   int      `json:"order"`
	Tags    []string `json:"tags"`
	Unicode string   `json:"unicode"`
}

type rawMessages struct {
	Groups []struct {
		Message string `json:"message"`
		Order   int    `json:"order"`
	} `json:"groups"`
}

func (s *BaseService) fetch(ctx context.Context) (*basePayload, error) {
	var raw []rawEmoji
	if err := s.getJSON(ctx, "/compact.json", &raw); err != nil {
		return nil, err
	}
	var messages rawMessages
	if err := s.getJSON(ctx, "/messages.json", &messages); err != nil {
		return nil, err
	}
	body, err := json.Marshal(buildPack(raw, messages))
	if err != nil {
		return nil, err
	}
	sum := sha256.Sum256(body)
	return &basePayload{body: body, etag: `"` + hex.EncodeToString(sum[:8]) + `"`}, nil
}

func (s *BaseService) getJSON(ctx context.Context, path string, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL+path, nil)
	if err != nil {
		return err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("emojibase %s: status %d", path, resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

// buildPack: tira componentes e itens sem grupo e ordena como o Unicode.
func buildPack(raw []rawEmoji, messages rawMessages) BasePack {
	sort.SliceStable(raw, func(i, j int) bool { return raw[i].Order < raw[j].Order })
	pack := BasePack{Groups: []BaseGroup{}, Emojis: make([]BaseEmoji, 0, len(raw))}
	for _, g := range messages.Groups {
		if g.Order != componentGroup {
			pack.Groups = append(pack.Groups, BaseGroup{ID: g.Order, Name: g.Message})
		}
	}
	for _, e := range raw {
		if e.Group == nil || *e.Group == componentGroup {
			continue
		}
		pack.Emojis = append(pack.Emojis, BaseEmoji{Emoji: e.Unicode, Label: e.Label, Keywords: e.Tags, Group: *e.Group})
	}
	return pack
}

type BaseHandler struct {
	service *BaseService
}

func NewBaseHandler(service *BaseService) *BaseHandler {
	return &BaseHandler{service: service}
}

// Serve: GET /emojis/base. Com o ETag que o app já tem, 304 sem corpo.
func (h *BaseHandler) Serve(c *gin.Context) {
	body, etag, err := h.service.Payload(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "emoji pack unavailable"})
		return
	}
	c.Header("ETag", etag)
	c.Header("Cache-Control", "private, max-age=86400")
	if c.GetHeader("If-None-Match") == etag {
		c.Status(http.StatusNotModified)
		return
	}
	c.Data(http.StatusOK, "application/json; charset=utf-8", body)
}
