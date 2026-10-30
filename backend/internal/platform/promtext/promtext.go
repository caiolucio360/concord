// Package promtext lê o formato de texto do Prometheus (o /metrics do LiveKit)
// sem dependência nova: só o que o coletor precisa (nome, rótulos e valor de
// cada linha; HELP/TYPE, timestamps e exemplares são ignorados).
package promtext

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"strconv"
	"strings"
)

// ErrStatus: o /metrics respondeu fora do 200.
var ErrStatus = errors.New("promtext: status inesperado")

// maxBody: o /metrics do LiveKit tem dezenas de KB; isso só evita ler lixo sem fim.
const maxBody = 8 << 20

type series struct {
	labels map[string]string
	value  float64
}

// Metrics: as séries lidas, por nome.
type Metrics map[string][]series

// Fetch baixa e lê o /metrics em url.
func Fetch(ctx context.Context, client *http.Client, url string) (Metrics, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("promtext: pedido: %w", err)
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("promtext: buscar %s: %w", url, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: %d", ErrStatus, resp.StatusCode)
	}
	return Parse(io.LimitReader(resp.Body, maxBody))
}

// Parse lê o texto; linhas que não entende são puladas.
func Parse(r io.Reader) (Metrics, error) {
	m := Metrics{}
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 64<<10), 1<<20)
	for scanner.Scan() {
		name, s, ok := parseLine(scanner.Text())
		if ok {
			m[name] = append(m[name], s)
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("promtext: ler: %w", err)
	}
	return m, nil
}

// parseLine: `nome{a="x",b="y"} valor [timestamp]`.
func parseLine(line string) (string, series, bool) {
	line = strings.TrimSpace(line)
	if line == "" || line[0] == '#' {
		return "", series{}, false
	}
	name, rest, labels := line, "", map[string]string{}
	if i := strings.IndexAny(line, "{ "); i >= 0 {
		name, rest = line[:i], line[i:]
	}
	if strings.HasPrefix(rest, "{") {
		var ok bool
		if labels, rest, ok = parseLabels(rest[1:]); !ok {
			return "", series{}, false
		}
	}
	fields := strings.Fields(rest)
	if len(fields) == 0 {
		return "", series{}, false
	}
	value, err := strconv.ParseFloat(fields[0], 64)
	if err != nil || math.IsNaN(value) || math.IsInf(value, 0) {
		return "", series{}, false
	}
	return name, series{labels: labels, value: value}, true
}

// parseLabels lê `a="x",b="y"}` (aspas e barras escapadas) e devolve o resto.
func parseLabels(s string) (map[string]string, string, bool) {
	labels := map[string]string{}
	for {
		s = strings.TrimLeft(s, ", ")
		if strings.HasPrefix(s, "}") {
			return labels, s[1:], true
		}
		eq := strings.Index(s, `="`)
		if eq <= 0 {
			return nil, "", false
		}
		value, rest, ok := quoted(s[eq+2:])
		if !ok {
			return nil, "", false
		}
		labels[s[:eq]] = value
		s = rest
	}
}

// quoted lê até a aspa que fecha (depois da aspa que abre).
func quoted(s string) (string, string, bool) {
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		switch c := s[i]; {
		case c == '"':
			return b.String(), s[i+1:], true
		case c == '\\' && i+1 < len(s):
			i++
			b.WriteByte(unescape(s[i]))
		default:
			b.WriteByte(c)
		}
	}
	return "", "", false
}

func unescape(c byte) byte {
	if c == 'n' {
		return '\n'
	}
	return c
}

// Sum soma as séries de name que têm todos os rótulos de want (nil = todas).
func (m Metrics) Sum(name string, want map[string]string) float64 {
	total := 0.0
	for _, s := range m[name] {
		if matches(s.labels, want) {
			total += s.value
		}
	}
	return total
}

// Has diz se alguma série de name apareceu.
func (m Metrics) Has(name string) bool {
	return len(m[name]) > 0
}

func matches(labels, want map[string]string) bool {
	for k, v := range want {
		if labels[k] != v {
			return false
		}
	}
	return true
}
