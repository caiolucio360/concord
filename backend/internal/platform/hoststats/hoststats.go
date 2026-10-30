// Package hoststats lê CPU e memória da máquina (/proc, Linux) para a
// observabilidade do servidor. Fora do Linux, Read devolve erro e o coletor
// grava a linha sem esses números.
package hoststats

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"
)

var errFormat = errors.New("hoststats: formato inesperado")

// Snapshot: CPU da máquina inteira (todas as vCPUs) desde a leitura anterior
// e memória em uso agora.
type Snapshot struct {
	// CPUPercent: nil na primeira leitura (não há intervalo).
	CPUPercent     *float64
	MemUsedPercent float64
}

type cpuTimes struct{ busy, total uint64 }

// Reader guarda a leitura anterior da CPU (o /proc/stat é acumulado).
type Reader struct {
	mu   sync.Mutex
	read func(string) ([]byte, error)
	prev *cpuTimes
}

func New() *Reader {
	return &Reader{read: os.ReadFile}
}

func (r *Reader) Read() (Snapshot, error) {
	stat, err := r.read("/proc/stat")
	if err != nil {
		return Snapshot{}, fmt.Errorf("hoststats: /proc/stat: %w", err)
	}
	now, err := parseCPU(stat)
	if err != nil {
		return Snapshot{}, err
	}
	mem, err := r.read("/proc/meminfo")
	if err != nil {
		return Snapshot{}, fmt.Errorf("hoststats: /proc/meminfo: %w", err)
	}
	used, err := parseMemUsed(mem)
	if err != nil {
		return Snapshot{}, err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	snap := Snapshot{CPUPercent: cpuPercent(r.prev, now), MemUsedPercent: used}
	r.prev = &now
	return snap, nil
}

func cpuPercent(prev *cpuTimes, now cpuTimes) *float64 {
	if prev == nil || now.total <= prev.total {
		return nil
	}
	pct := float64(now.busy-prev.busy) * 100 / float64(now.total-prev.total)
	return &pct
}

// parseCPU: a linha "cpu" agregada; ocioso = idle + iowait.
func parseCPU(stat []byte) (cpuTimes, error) {
	line, _, _ := bytes.Cut(stat, []byte("\n"))
	fields := strings.Fields(string(line))
	if len(fields) < 5 || fields[0] != "cpu" {
		return cpuTimes{}, errFormat
	}
	var t cpuTimes
	for i, f := range fields[1:] {
		v, err := strconv.ParseUint(f, 10, 64)
		if err != nil {
			return cpuTimes{}, errFormat
		}
		t.total += v
		if i != 3 && i != 4 { // idle, iowait
			t.busy += v
		}
	}
	return t, nil
}

// parseMemUsed: 100 × (total − disponível) / total.
func parseMemUsed(meminfo []byte) (float64, error) {
	values := map[string]float64{}
	scanner := bufio.NewScanner(bytes.NewReader(meminfo))
	for scanner.Scan() {
		key, rest, ok := strings.Cut(scanner.Text(), ":")
		if !ok {
			continue
		}
		if v, err := strconv.ParseFloat(strings.Fields(rest + " 0")[0], 64); err == nil {
			values[key] = v
		}
	}
	total, available := values["MemTotal"], values["MemAvailable"]
	if total <= 0 {
		return 0, errFormat
	}
	return (total - available) * 100 / total, nil
}
