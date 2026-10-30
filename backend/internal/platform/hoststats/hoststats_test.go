package hoststats

import (
	"errors"
	"math"
	"testing"
)

const stat1 = "cpu  100 0 100 700 100 0 0 0 0 0\ncpu0 50 0 50 350 50 0 0 0 0 0\n"
const stat2 = "cpu  250 0 150 800 100 0 0 0 0 0\ncpu0 1 1 1 1 1 0 0 0 0 0\n"

const meminfo = `MemTotal:        4000000 kB
MemFree:          500000 kB
MemAvailable:    1000000 kB
Buffers:           10000 kB
`

func fakeReader(files map[string]string) func(string) ([]byte, error) {
	return func(path string) ([]byte, error) {
		s, ok := files[path]
		if !ok {
			return nil, errors.New("sem arquivo")
		}
		return []byte(s), nil
	}
}

func TestCPUPercentEntreDuasLeituras(t *testing.T) {
	files := map[string]string{"/proc/stat": stat1, "/proc/meminfo": meminfo}
	r := &Reader{read: fakeReader(files)}
	first, err := r.Read()
	if err != nil {
		t.Fatal(err)
	}
	if first.CPUPercent != nil {
		t.Errorf("primeira leitura = %v, quer nil (sem intervalo)", *first.CPUPercent)
	}
	files["/proc/stat"] = stat2
	second, err := r.Read()
	if err != nil {
		t.Fatal(err)
	}
	// ocupado: +150 user +50 system = 200; total: 200 + 100 idle = 300.
	if second.CPUPercent == nil || math.Abs(*second.CPUPercent-66.67) > 0.01 {
		t.Errorf("CPU = %v, quer ~66,67", second.CPUPercent)
	}
	if math.Abs(second.MemUsedPercent-75) > 0.001 {
		t.Errorf("memória = %v, quer 75", second.MemUsedPercent)
	}
}

func TestSemProcDevolveErro(t *testing.T) {
	r := &Reader{read: fakeReader(map[string]string{})}
	if _, err := r.Read(); err == nil {
		t.Fatal("quer erro sem /proc")
	}
}

func TestLinhasEstranhas(t *testing.T) {
	tests := []struct {
		name  string
		stat  string
		mem   string
		valid bool
	}{
		{"sem linha cpu", "intr 1 2\n", meminfo, false},
		{"cpu com campo ruim", "cpu  a b c d\n", meminfo, false},
		{"meminfo sem total", stat1, "MemFree: 1 kB\n", false},
		{"ok", stat1, meminfo, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &Reader{read: fakeReader(map[string]string{"/proc/stat": tt.stat, "/proc/meminfo": tt.mem})}
			_, err := r.Read()
			if (err == nil) != tt.valid {
				t.Errorf("err = %v, valid = %v", err, tt.valid)
			}
		})
	}
}

func TestNewLeDoDisco(t *testing.T) {
	if New().read == nil {
		t.Fatal("New sem leitor")
	}
}
