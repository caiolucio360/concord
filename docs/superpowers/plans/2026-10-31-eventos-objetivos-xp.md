# Objetivos e XP do evento (Fase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O evento ganha até 3 objetivos (ficar N min na sala; jogar o jogo do evento por N min), cada um com dificuldade; quem tem **Vou**, é conta real e cumpre dentro da sala do evento ganha XP pessoal e XP do servidor, com tetos diários.

**Architecture:** Pacote novo `backend/internal/eventobjective/` (molde do `serverlevel`): um tracker em memória soma os minutos elegíveis lendo `call.CallSnapshots()`, o progresso vai para `event_objective_progress` (chave: objetivo + pessoa + início da ocorrência) e o pagamento é uma transação única (conclusão + teto pessoal + XP pessoal + `server_level_add(..., 'evento', ...)`). O `event` guarda e valida o conjunto de objetivos por funções do `eventobjective`; o app ganha uma seção no formulário, uma lista com barras no detalhe e o aviso `event:objective`. Spec: [2026-10-31-eventos-objetivos-xp-design.md](../specs/2026-10-31-eventos-objetivos-xp-design.md). ADR: [0037](../../adr/0037-objetivos-do-evento-pagos-em-transacao-unica.md).

**Tech Stack:** Go 1.26 + Gin + pgx; React + Zustand + Tailwind v4 + Vitest (SSR com `renderToStaticMarkup`). Sem dependência nova.

## Global Constraints

- CRAP ≤ 15 em toda função tocada (`node scripts/crap.mjs`); baseline em `…/scratchpad/crap3-antes.txt`. Já passavam de 15 antes, e **não são tocadas**: `SQLAudience.Audience` (`platform/websocket/activity.go`), `level.Service.Run` e `level.Repository.FindByUserIDs`.
- Nenhum arquivo tocado acima de 400 linhas cresce; nenhum campo novo em `callStore`, `chatStore`, `serverStore`, nenhum método novo em `call/service.go`.
- Sem dependência nova em `go.mod` nem `package.json` (o `golang.org/x/text` é só indireto: **não importar**; a comparação de nome de jogo é feita à mão, ver Task 4).
- Código, comentários, docs, UI e commits em português; commits convencionais (`feat(eventos):`); **sem** `Co-Authored-By` nem atribuição a IA.
- Valores (spec): XP pessoal Fácil 1.000 / Médio 3.000 / Difícil 6.000; servidor 5%: 50 / 150 / 300. Teto pessoal 6.000 XP por pessoa por dia (dia de Brasília); teto do servidor da fonte `evento` 300 por pessoa por dia. Até 3 objetivos; metas 15, 30, 45, 60, 90, 120 min e ≤ a duração do evento.
- Textos de UI exatamente os da spec (seção "Textos aprovados"). Nenhuma DM do bot muda.
- Responsivo 360/768/1280 px; ícones só de `shared/ui/icons`; botões `Button`/`IconButton`; tokens de cor e texto; `focus-ring`.
- Os testes com banco usam `TEST_DATABASE_URL` (Postgres descartável e já migrado). Go em `GO=…/scratchpad/godl/go/bin/go.exe`. Não rode `prettier --write` nem `gofmt -w` no repo todo (CRLF); `gofmt -l` só nos arquivos tocados.

---

### Task 1: Modelo e validação dos objetivos (puro)

**Files:**
- Create: `backend/internal/eventobjective/model.go`, `backend/internal/eventobjective/validate.go`
- Test: `backend/internal/eventobjective/model_test.go`, `backend/internal/eventobjective/validate_test.go`

**Interfaces:**
- Produces (usados nas Tasks 2–6):
  - `type Kind string` com `KindTime = "time"`, `KindGame = "game"`
  - `type Difficulty string` com `Easy = "easy"`, `Medium = "medium"`, `Hard = "hard"`
  - `const MaxObjectives = 3`, `var AllowedMinutes = []int{15, 30, 45, 60, 90, 120}`
  - `const DailyPersonalCap int64 = 6000`
  - `func PersonalXP(d Difficulty) int64`, `func ServerXP(d Difficulty) int64`
  - `type Input struct { Kind Kind; Difficulty Difficulty; Minutes int }` (JSON `kind`, `difficulty`, `minutes`)
  - `type Objective struct { ID string; Kind Kind; Difficulty Difficulty; Minutes int; XP int64; MyMinutes int; MyDone bool }` (JSON `id`, `kind`, `difficulty`, `minutes`, `xp`, `my_minutes`, `my_done`)
  - `var ErrInvalidObjective`
  - `func Validate(in []Input, durationMinutes int, hasGame bool) error`

- [ ] **Step 1: Escrever os testes que falham**

`model_test.go`:

```go
package eventobjective

import "testing"

func TestXPTable(t *testing.T) {
	cases := []struct {
		d        Difficulty
		personal int64
		server   int64
	}{
		{Easy, 1000, 50},
		{Medium, 3000, 150},
		{Hard, 6000, 300},
	}
	for _, c := range cases {
		if got := PersonalXP(c.d); got != c.personal {
			t.Errorf("%s pessoal = %d, esperava %d", c.d, got, c.personal)
		}
		if got := ServerXP(c.d); got != c.server {
			t.Errorf("%s servidor = %d, esperava %d", c.d, got, c.server)
		}
	}
	if PersonalXP("???") != 0 || ServerXP("???") != 0 {
		t.Error("dificuldade desconhecida não vale XP")
	}
}
```

`validate_test.go`:

```go
package eventobjective

import (
	"errors"
	"testing"
)

func ok(k Kind) Input { return Input{Kind: k, Difficulty: Easy, Minutes: 30} }

func TestValidateAccepts(t *testing.T) {
	cases := map[string]struct {
		in       []Input
		duration int
		hasGame  bool
	}{
		"sem objetivos":        {nil, 120, false},
		"lista vazia":          {[]Input{}, 120, false},
		"um de tempo":          {[]Input{ok(KindTime)}, 120, false},
		"jogo com jogo":        {[]Input{ok(KindGame)}, 120, true},
		"três objetivos":       {[]Input{ok(KindTime), ok(KindTime), ok(KindGame)}, 120, true},
		"meta igual à duração": {[]Input{{KindTime, Hard, 120}}, 120, false},
	}
	for name, c := range cases {
		if err := Validate(c.in, c.duration, c.hasGame); err != nil {
			t.Errorf("%s: %v", name, err)
		}
	}
}

func TestValidateRejects(t *testing.T) {
	cases := map[string]struct {
		in       []Input
		duration int
		hasGame  bool
	}{
		"quatro objetivos":      {[]Input{ok(KindTime), ok(KindTime), ok(KindTime), ok(KindTime)}, 240, false},
		"tipo desconhecido":     {[]Input{{"tempo", Easy, 30}}, 120, false},
		"dificuldade invalida":  {[]Input{{KindTime, "extreme", 30}}, 120, false},
		"meta fora da lista":    {[]Input{{KindTime, Easy, 20}}, 120, false},
		"meta zero":             {[]Input{{KindTime, Easy, 0}}, 120, false},
		"meta maior que evento": {[]Input{{KindTime, Easy, 60}}, 30, false},
		"jogo sem jogo":         {[]Input{ok(KindGame)}, 120, false},
	}
	for name, c := range cases {
		if err := Validate(c.in, c.duration, c.hasGame); !errors.Is(err, ErrInvalidObjective) {
			t.Errorf("%s: erro %v, esperava ErrInvalidObjective", name, err)
		}
	}
}
```

- [ ] **Step 2: Ver falhar**

Run: `cd backend && "$GO" test ./internal/eventobjective/...`
Expected: FAIL (`undefined: Difficulty` etc.; pacote ainda sem código).

- [ ] **Step 3: Implementar**

`model.go`:

```go
// Package eventobjective: objetivos dos eventos do servidor e o XP que pagam
// (docs/superpowers/specs/2026-10-31-eventos-objetivos-xp-design.md).
package eventobjective

import "errors"

type Kind string

const (
	// KindTime: ficar N minutos na sala do evento.
	KindTime Kind = "time"
	// KindGame: jogar o jogo do evento por N minutos.
	KindGame Kind = "game"
)

type Difficulty string

const (
	Easy   Difficulty = "easy"
	Medium Difficulty = "medium"
	Hard   Difficulty = "hard"
)

// MaxObjectives: no máximo 3 objetivos por evento.
const MaxObjectives = 3

// AllowedMinutes: as metas que o moderador pode escolher (minutos).
var AllowedMinutes = []int{15, 30, 45, 60, 90, 120}

// DailyPersonalCap: o máximo de XP pessoal que os eventos pagam a uma pessoa
// por dia (dia de Brasília), somando todos os eventos e servidores.
const DailyPersonalCap int64 = 6000

var ErrInvalidObjective = errors.New("objetivo inválido")

// PersonalXP é o XP pessoal que um objetivo da dificuldade paga.
func PersonalXP(d Difficulty) int64 {
	switch d {
	case Easy:
		return 1000
	case Medium:
		return 3000
	case Hard:
		return 6000
	}
	return 0
}

// ServerXP é a parte do servidor: 5% do XP pessoal.
func ServerXP(d Difficulty) int64 { return PersonalXP(d) / 20 }

// Input é o que o moderador manda para cada objetivo.
type Input struct {
	Kind       Kind       `json:"kind"`
	Difficulty Difficulty `json:"difficulty"`
	Minutes    int        `json:"minutes"`
}

// Objective é o objetivo como o app o recebe, com o meu progresso na ocorrência atual.
type Objective struct {
	ID         string     `json:"id"`
	Kind       Kind       `json:"kind"`
	Difficulty Difficulty `json:"difficulty"`
	Minutes    int        `json:"minutes"`
	// XP: o XP pessoal que paga (o do servidor é 5% disso).
	XP        int64 `json:"xp"`
	MyMinutes int   `json:"my_minutes"`
	MyDone    bool  `json:"my_done"`
}
```

`validate.go`:

```go
package eventobjective

import "slices"

// Validate confere o conjunto de objetivos do evento final (já com a duração e
// o jogo que ele terá): até MaxObjectives, tipo e dificuldade conhecidos, meta
// da lista e que caiba na duração, e o tipo "jogo" só com jogo no evento.
func Validate(in []Input, durationMinutes int, hasGame bool) error {
	if len(in) > MaxObjectives {
		return ErrInvalidObjective
	}
	for _, o := range in {
		if !validObjective(o, durationMinutes, hasGame) {
			return ErrInvalidObjective
		}
	}
	return nil
}

func validObjective(o Input, durationMinutes int, hasGame bool) bool {
	if o.Kind != KindTime && o.Kind != KindGame {
		return false
	}
	if o.Kind == KindGame && !hasGame {
		return false
	}
	if PersonalXP(o.Difficulty) == 0 {
		return false
	}
	return slices.Contains(AllowedMinutes, o.Minutes) && o.Minutes <= durationMinutes
}
```

- [ ] **Step 4: Ver passar**

Run: `cd backend && "$GO" test ./internal/eventobjective/... && "$GO" vet ./internal/eventobjective/...`
Expected: `ok`.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/eventobjective
git commit -m "feat(eventos): modelo e validação dos objetivos do evento"
```

---

### Task 2: Tabelas e repositório dos objetivos

**Files:**
- Create: `backend/migrations/000183_event_objectives.up.sql`, `backend/migrations/000183_event_objectives.down.sql`, `backend/internal/eventobjective/repository.go`
- Test: `backend/internal/eventobjective/repository_db_test.go`

**Interfaces:**
- Consumes: Task 1 (`Input`, `Objective`, `PersonalXP`).
- Produces:
  - `type Execer interface { Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error) }`
  - `type Querier interface { Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) }`
  - `func ReplaceTx(ctx context.Context, tx Execer, eventID string, in []Input) error`
  - `type EventRef struct { EventID string; Occurrence time.Time }`
  - `func LoadFor(ctx context.Context, q Querier, userID string, refs []EventRef) (map[string][]Objective, error)` (chave: id do evento; `userID` vazio = sem progresso)
  - `type Repository struct{ db *pgxpool.Pool }` e `func NewRepository(db *pgxpool.Pool) *Repository`
  - `func (r *Repository) AddMinutes(ctx context.Context, objectiveID, userID string, occurrence time.Time, minutes int) (int, error)` (devolve o total de minutos gravados)

> Migrations: o número é o próximo livre da `develop` quando a fase começar (000183 hoje, depois da 000182 do jogo do evento; `node scripts/check-migrations.mjs` confere duplicados). Se a `develop` já tiver 000183, use o seguinte e acerte também o número da Task 5.

- [ ] **Step 1: Migration**

`000183_event_objectives.up.sql`:

```sql
-- Objetivos dos eventos e o progresso de cada pessoa por ocorrência
-- (docs/adr/0037-objetivos-do-evento-pagos-em-transacao-unica.md).
CREATE TABLE event_objectives (
    id         UUID PRIMARY KEY,
    event_id   UUID NOT NULL REFERENCES server_events(id) ON DELETE CASCADE,
    position   SMALLINT NOT NULL,
    kind       TEXT NOT NULL CHECK (kind IN ('time', 'game')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    minutes    SMALLINT NOT NULL CHECK (minutes > 0),
    UNIQUE (event_id, position)
);

-- Uma linha por pessoa, objetivo e ocorrência: a ocorrência nova começa do zero
-- sem limpeza. completed_at marca o pagamento (feito na mesma transação).
CREATE TABLE event_objective_progress (
    objective_id  UUID NOT NULL REFERENCES event_objectives(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    occurrence_at TIMESTAMPTZ NOT NULL,
    minutes       INT NOT NULL DEFAULT 0,
    completed_at  TIMESTAMPTZ,
    xp_paid       INT NOT NULL DEFAULT 0,
    PRIMARY KEY (objective_id, user_id, occurrence_at)
);

-- Teto diário do XP pessoal que os eventos pagam (dia de Brasília).
CREATE TABLE event_xp_daily (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day     DATE NOT NULL,
    xp      INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
);
```

`000183_event_objectives.down.sql`:

```sql
DROP TABLE IF EXISTS event_xp_daily;
DROP TABLE IF EXISTS event_objective_progress;
DROP TABLE IF EXISTS event_objectives;
```

Aplique no banco de teste (programa temporário, apagado depois):

```bash
cd backend && mkdir -p tmpmigrate && cat > tmpmigrate/main.go <<'EOF'
package main

import (
	"log"
	"os"

	"gin-quickstart/backend/internal/platform/database"
)

func main() {
	db, err := database.Connect(os.Getenv("TEST_DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	if err := database.Migrate(db, "migrations"); err != nil {
		log.Fatal(err)
	}
}
EOF
"$GO" run ./tmpmigrate; rm -rf tmpmigrate
```

- [ ] **Step 2: Teste que falha**

`repository_db_test.go` (modele o `eventDB`/`seedUserAndServer` no `event/repository_db_test.go`; copie os helpers que precisar, o pacote não pode importar testes de outro):

```go
package eventobjective

import (
	"context"
	"os"
	"testing"
	"time"

	"gin-quickstart/backend/internal/platform/database"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func testDB(t *testing.T) (*pgxpool.Pool, context.Context) {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL não definido")
	}
	db, err := database.Connect(url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(db.Close)
	return db, context.Background()
}

func mustExec(t *testing.T, db *pgxpool.Pool, sql string, args ...any) {
	t.Helper()
	if _, err := db.Exec(context.Background(), sql, args...); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
}

// seedEvent cria uma pessoa, um servidor dela e um evento; devolve os ids.
func seedEvent(t *testing.T, db *pgxpool.Pool) (userID, serverID, eventID string) {
	t.Helper()
	userID, serverID, eventID = uuid.NewString(), uuid.NewString(), uuid.NewString()
	mustExec(t, db, `INSERT INTO users (id, username, display_name, email, password_hash, email_verified)
		VALUES ($1, $2, $2, $3, 'x', true)`, userID, "u"+userID[:8], userID[:8]+"@t.dev")
	mustExec(t, db, `INSERT INTO servers (id, name, owner_id) VALUES ($1, $2, $3)`, serverID, "S"+serverID[:6], userID)
	mustExec(t, db, `INSERT INTO server_members (server_id, user_id) VALUES ($1, $2)`, serverID, userID)
	mustExec(t, db, `INSERT INTO server_events (id, server_id, scope, title, starts_at, next_start_at, duration_minutes, recurrence, created_by)
		VALUES ($1, $2, 'server', 'Noite', NOW(), NOW(), 120, 'none', $3)`, eventID, serverID, userID)
	return userID, serverID, eventID
}

func TestReplaceAndLoadObjectives(t *testing.T) {
	db, ctx := testDB(t)
	userID, _, eventID := seedEvent(t, db)
	occ := time.Now().UTC().Truncate(time.Second)
	in := []Input{{KindTime, Easy, 30}, {KindGame, Hard, 60}}

	if err := pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error { return ReplaceTx(ctx, tx, eventID, in) }); err != nil {
		t.Fatal(err)
	}
	got, err := LoadFor(ctx, db, userID, []EventRef{{eventID, occ}})
	if err != nil {
		t.Fatal(err)
	}
	list := got[eventID]
	if len(list) != 2 || list[0].Kind != KindTime || list[0].XP != 1000 || list[1].Difficulty != Hard || list[1].XP != 6000 {
		t.Fatalf("objetivos = %+v", list)
	}
	if list[0].MyMinutes != 0 || list[0].MyDone {
		t.Errorf("sem progresso ainda: %+v", list[0])
	}

	// Trocar o conjunto troca tudo (e some o antigo).
	if err := pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		return ReplaceTx(ctx, tx, eventID, []Input{{KindTime, Medium, 15}})
	}); err != nil {
		t.Fatal(err)
	}
	got, _ = LoadFor(ctx, db, userID, []EventRef{{eventID, occ}})
	if len(got[eventID]) != 1 || got[eventID][0].Difficulty != Medium {
		t.Fatalf("depois de trocar = %+v", got[eventID])
	}
	if err := pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error { return ReplaceTx(ctx, tx, eventID, nil) }); err != nil {
		t.Fatal(err)
	}
	got, _ = LoadFor(ctx, db, userID, []EventRef{{eventID, occ}})
	if len(got[eventID]) != 0 {
		t.Errorf("sem objetivos deveria vir vazio: %+v", got[eventID])
	}
}

func TestAddMinutesAccumulatesPerOccurrence(t *testing.T) {
	db, ctx := testDB(t)
	repo := NewRepository(db)
	userID, _, eventID := seedEvent(t, db)
	if err := pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		return ReplaceTx(ctx, tx, eventID, []Input{{KindTime, Easy, 30}})
	}); err != nil {
		t.Fatal(err)
	}
	occ := time.Now().UTC().Truncate(time.Second)
	refs := []EventRef{{eventID, occ}}
	objID := mustLoad(t, db, userID, refs)[0].ID

	if total, err := repo.AddMinutes(ctx, objID, userID, occ, 2); err != nil || total != 2 {
		t.Fatalf("total = %d (%v), esperava 2", total, err)
	}
	if total, err := repo.AddMinutes(ctx, objID, userID, occ, 3); err != nil || total != 5 {
		t.Fatalf("total = %d (%v), esperava 5", total, err)
	}
	if got := mustLoad(t, db, userID, refs)[0]; got.MyMinutes != 5 {
		t.Errorf("my_minutes = %d", got.MyMinutes)
	}
	// Outra ocorrência começa do zero.
	next := occ.Add(7 * 24 * time.Hour)
	if total, _ := repo.AddMinutes(ctx, objID, userID, next, 1); total != 1 {
		t.Errorf("ocorrência nova deveria somar do zero, total = %d", total)
	}
	if got := mustLoad(t, db, userID, []EventRef{{eventID, next}})[0]; got.MyMinutes != 1 {
		t.Errorf("my_minutes da ocorrência nova = %d", got.MyMinutes)
	}
}

func mustLoad(t *testing.T, db *pgxpool.Pool, userID string, refs []EventRef) []Objective {
	t.Helper()
	got, err := LoadFor(context.Background(), db, userID, refs)
	if err != nil {
		t.Fatal(err)
	}
	return got[refs[0].EventID]
}
```

> Os nomes das colunas de `users`, `servers`, `server_members` e `server_events` devem ser os do `seedUserAndServer` do `event/repository_db_test.go`: **copie o INSERT de lá** se algum NOT NULL diferente exigir ajuste.

- [ ] **Step 3: Ver falhar**

Run: `cd backend && "$GO" test ./internal/eventobjective/ -run 'Replace|AddMinutes'`
Expected: FAIL (`undefined: ReplaceTx`).

- [ ] **Step 4: Implementar**

`repository.go`:

```go
package eventobjective

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Execer: o que ReplaceTx precisa da transação (ou do pool).
type Execer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// Querier: o que LoadFor precisa para ler.
type Querier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

// ReplaceTx troca o conjunto de objetivos do evento (dentro da transação que
// grava o evento). Objetivo novo ganha id novo; o progresso antigo vai junto
// (ON DELETE CASCADE): só dá para editar antes de o evento começar.
func ReplaceTx(ctx context.Context, tx Execer, eventID string, in []Input) error {
	if _, err := tx.Exec(ctx, `DELETE FROM event_objectives WHERE event_id = $1`, eventID); err != nil {
		return err
	}
	for i, o := range in {
		if _, err := tx.Exec(ctx, `
			INSERT INTO event_objectives (id, event_id, position, kind, difficulty, minutes)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			uuid.NewString(), eventID, i, string(o.Kind), string(o.Difficulty), o.Minutes); err != nil {
			return err
		}
	}
	return nil
}

// EventRef é um evento e a ocorrência cujo progresso interessa.
type EventRef struct {
	EventID    string
	Occurrence time.Time
}

// LoadFor lê os objetivos dos eventos, na ordem em que foram cadastrados, com
// o progresso de userID na ocorrência pedida (userID vazio = sem progresso).
func LoadFor(ctx context.Context, q Querier, userID string, refs []EventRef) (map[string][]Objective, error) {
	out := make(map[string][]Objective, len(refs))
	if len(refs) == 0 {
		return out, nil
	}
	ids := make([]string, len(refs))
	occs := make([]time.Time, len(refs))
	for i, r := range refs {
		ids[i], occs[i] = r.EventID, r.Occurrence
	}
	var user any
	if userID != "" {
		user = userID
	}
	rows, err := q.Query(ctx, `
		SELECT o.event_id, o.id, o.kind, o.difficulty, o.minutes,
		       COALESCE(p.minutes, 0), p.completed_at IS NOT NULL
		FROM unnest($1::uuid[], $3::timestamptz[]) AS ev(id, occ)
		JOIN event_objectives o ON o.event_id = ev.id
		LEFT JOIN event_objective_progress p
		       ON p.objective_id = o.id AND p.user_id = $2::uuid AND p.occurrence_at = ev.occ
		ORDER BY o.event_id, o.position`, ids, user, occs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var eventID, kind, difficulty string
		var o Objective
		if err := rows.Scan(&eventID, &o.ID, &kind, &difficulty, &o.Minutes, &o.MyMinutes, &o.MyDone); err != nil {
			return nil, err
		}
		o.Kind, o.Difficulty = Kind(kind), Difficulty(difficulty)
		o.XP = PersonalXP(o.Difficulty)
		out[eventID] = append(out[eventID], o)
	}
	return out, rows.Err()
}

// AddMinutes soma minutos ao progresso da pessoa na ocorrência e devolve o total.
func (r *Repository) AddMinutes(ctx context.Context, objectiveID, userID string, occurrence time.Time, minutes int) (int, error) {
	var total int
	err := r.db.QueryRow(ctx, `
		INSERT INTO event_objective_progress (objective_id, user_id, occurrence_at, minutes)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (objective_id, user_id, occurrence_at)
		DO UPDATE SET minutes = event_objective_progress.minutes + EXCLUDED.minutes
		RETURNING minutes`, objectiveID, userID, occurrence, minutes).Scan(&total)
	return total, err
}
```

- [ ] **Step 5: Ver passar**

Run: `cd backend && "$GO" test ./internal/eventobjective/ && "$GO" vet ./internal/eventobjective/ && cd .. && node scripts/check-migrations.mjs`
Expected: `ok` e migrations sem duplicados.

- [ ] **Step 6: Commit**

```bash
git add backend/migrations/000183_event_objectives.* backend/internal/eventobjective
git commit -m "feat(eventos): tabelas e repositório dos objetivos do evento"
```

---

### Task 3: Objetivos dentro do evento (modelo, validação, gravação, leitura)

**Files:**
- Modify: `backend/internal/event/model.go` (campos), `backend/internal/event/validate.go` (validação), `backend/internal/event/service.go` (`apply`, `sameSchedule`), `backend/internal/event/repository.go` (`Create`, `Update`, `Find`, `ListUpcoming`), `backend/internal/event/handler.go` (código de erro)
- Test: `backend/internal/event/validate_test.go`, `service_test.go`, `repository_db_test.go`, `handler_test.go`

**Interfaces:**
- Consumes: Task 1 e 2 (`eventobjective.Input`, `Objective`, `Validate`, `ErrInvalidObjective`, `ReplaceTx`, `LoadFor`, `EventRef`).
- Produces:
  - `Event.Objectives []eventobjective.Objective` (JSON `objectives`, nunca `null`: lista vazia)
  - `Input.Objectives []eventobjective.Input` (JSON `objectives`)
  - erro `invalid_objective` (400) no handler; `ErrEventRunning` quando mexer nos objetivos com o evento em andamento.

- [ ] **Step 1: Testes que falham**

`validate_test.go` (acrescente):

```go
func TestNormalizeValidatesObjectives(t *testing.T) {
	now := time.Date(2026, 11, 1, 12, 0, 0, 0, time.UTC)
	cases := []struct {
		name string
		edit func(*Input)
		want error
	}{
		{"jogo sem jogo", func(i *Input) {
			i.Objectives = []eventobjective.Input{{Kind: eventobjective.KindGame, Difficulty: eventobjective.Easy, Minutes: 30}}
		}, eventobjective.ErrInvalidObjective},
		{"meta maior que a duração", func(i *Input) {
			i.DurationMinutes = 30
			i.Objectives = []eventobjective.Input{{Kind: eventobjective.KindTime, Difficulty: eventobjective.Easy, Minutes: 60}}
		}, eventobjective.ErrInvalidObjective},
		{"quatro objetivos", func(i *Input) {
			o := eventobjective.Input{Kind: eventobjective.KindTime, Difficulty: eventobjective.Easy, Minutes: 15}
			i.Objectives = []eventobjective.Input{o, o, o, o}
		}, eventobjective.ErrInvalidObjective},
	}
	for _, c := range cases {
		in := validInput(now)
		c.edit(&in)
		if _, err := in.normalize(now); !errors.Is(err, c.want) {
			t.Errorf("%s: erro %v, esperava %v", c.name, err, c.want)
		}
	}
	ok := validInput(now)
	ok.GameName = "Minecraft"
	ok.Objectives = []eventobjective.Input{{Kind: eventobjective.KindGame, Difficulty: eventobjective.Hard, Minutes: 60}}
	if _, err := ok.normalize(now); err != nil {
		t.Errorf("objetivo de jogo com jogo deveria passar: %v", err)
	}
}
```

(importe `gin-quickstart/backend/internal/eventobjective` no teste.)

`service_test.go` (acrescente; use o `fakeStore`/helpers que o arquivo já tem para criar e atualizar, como nos testes do jogo da Fase 2):

```go
func TestUpdateRunningEventRejectsChangedObjectives(t *testing.T) {
	// Evento em andamento com um objetivo; o pedido troca a meta: event_running.
	// Mantém o mesmo agendamento e o mesmo jogo, só muda o objetivo.
	svc, st, now := runningFixture(t) // helper já usado pelos testes de "jogo travado em andamento"
	st.event.Objectives = []eventobjective.Objective{{Kind: eventobjective.KindTime, Difficulty: eventobjective.Easy, Minutes: 30}}
	in := inputOf(st.event) // idem: monta o Input igual ao evento
	in.Objectives = []eventobjective.Input{{Kind: eventobjective.KindTime, Difficulty: eventobjective.Easy, Minutes: 60}}
	if _, err := svc.Update(context.Background(), st.event.ServerID, st.event.ID, "dono", in); !errors.Is(err, ErrEventRunning) {
		t.Fatalf("erro = %v, esperava ErrEventRunning (now=%v)", err, now)
	}
	// Mesmo conjunto: passa.
	in.Objectives = []eventobjective.Input{{Kind: eventobjective.KindTime, Difficulty: eventobjective.Easy, Minutes: 30}}
	if _, err := svc.Update(context.Background(), st.event.ServerID, st.event.ID, "dono", in); err != nil {
		t.Fatalf("mesmo conjunto deveria passar: %v", err)
	}
}
```

> `runningFixture` e `inputOf` são os helpers que os testes da Fase 2 (`TestUpdateRunning…Game…` em `service_test.go`) já usam; leia esse arquivo e use os nomes reais (se o helper for inline, extraia-o numa função de teste pequena nesta mesma tarefa).

`repository_db_test.go` (acrescente):

```go
func TestRepositoryStoresAndReadsObjectives(t *testing.T) {
	db, ctx := eventDB(t)
	repo := NewRepository(db)
	userID, serverID := seedUserAndServer(t, db, "Obj")
	in := validDBInput()
	in.GameName = "Minecraft"
	in.Objectives = []eventobjective.Input{
		{Kind: eventobjective.KindTime, Difficulty: eventobjective.Easy, Minutes: 30},
		{Kind: eventobjective.KindGame, Difficulty: eventobjective.Hard, Minutes: 60},
	}
	e := newEvent(serverID, userID, in)
	if err := repo.Create(ctx, e, nil); err != nil {
		t.Fatal(err)
	}
	list, err := repo.ListUpcoming(ctx, serverID, userID)
	if err != nil || len(list) != 1 || len(list[0].Objectives) != 2 {
		t.Fatalf("lista = %+v (%v)", list, err)
	}
	if list[0].Objectives[1].Kind != eventobjective.KindGame || list[0].Objectives[1].XP != 6000 {
		t.Errorf("objetivos = %+v", list[0].Objectives)
	}
	found, err := repo.Find(ctx, serverID, e.ID)
	if err != nil || len(found.Objectives) != 2 {
		t.Fatalf("Find = %+v (%v)", found, err)
	}
	// Sem objetivos o JSON leva lista vazia, não null.
	e2 := newEvent(serverID, userID, validDBInput())
	if err := repo.Create(ctx, e2, nil); err != nil {
		t.Fatal(err)
	}
	got, _ := repo.Find(ctx, serverID, e2.ID)
	if got.Objectives == nil {
		t.Error("Objectives deveria ser lista vazia, não nil")
	}
}
```

(`validDBInput()` = o helper que o arquivo já usa para montar um `Input` válido; use o nome real.)

`handler_test.go`: acrescente a linha `{eventobjective.ErrInvalidObjective, http.StatusBadRequest, "invalid_objective"},` na tabela de `TestDomainErrorsBecomeStatusAndCode`.

- [ ] **Step 2: Ver falhar**

Run: `cd backend && "$GO" test ./internal/event/ -run 'Objective'`
Expected: FAIL (`unknown field Objectives`).

- [ ] **Step 3: Implementar**

`model.go`: importe `gin-quickstart/backend/internal/eventobjective` e acrescente

```go
// em Event, depois de GameName:
	// Objectives: os objetivos do evento, com o meu progresso na ocorrência atual.
	Objectives []eventobjective.Objective `json:"objectives"`

// em Input, depois de GameName:
	// Objectives: até 3 objetivos (vazio = sem objetivos).
	Objectives []eventobjective.Input `json:"objectives"`
```

`validate.go`, no fim de `normalize` (depois de a duração estar limpa; veja onde `cleanDuration` é chamado e use a duração e o jogo já limpos):

```go
	if err := eventobjective.Validate(in.Objectives, in.DurationMinutes, in.GameName != ""); err != nil {
		return in, err
	}
```

`service.go`:
- `apply` passa a levar os objetivos para o evento só para o repositório gravar (o Event guarda o conjunto como `Objective` sem id; o repositório os troca):

```go
func objectivesOf(in []eventobjective.Input) []eventobjective.Objective {
	out := make([]eventobjective.Objective, len(in))
	for i, o := range in {
		out[i] = eventobjective.Objective{Kind: o.Kind, Difficulty: o.Difficulty, Minutes: o.Minutes}
	}
	return out
}
```

e em `apply`: `e.Objectives = objectivesOf(in.Objectives)`.

- `sameSchedule` ganha, antes do `return nil` final, a comparação dos objetivos (extraída numa função para manter o CRAP baixo):

```go
	if !sameObjectives(e.Objectives, in.Objectives) {
		return ErrEventRunning
	}

// sameObjectives: o pedido repete os objetivos do evento (tipo, dificuldade e meta, na ordem).
func sameObjectives(have []eventobjective.Objective, want []eventobjective.Input) bool {
	if len(have) != len(want) {
		return false
	}
	for i, o := range have {
		if o.Kind != want[i].Kind || o.Difficulty != want[i].Difficulty || o.Minutes != want[i].Minutes {
			return false
		}
	}
	return true
}
```

(`sameSchedule` já é a função mais complexa da área, CRAP 12: mantenha a soma do `if` principal como está e use o `if` novo à parte para não subir a complexidade acima de 15; confira com `node scripts/crap.mjs --files backend/internal/event/service.go`.)

`repository.go`:
- `Create`: depois de `insertReminders`, dentro da transação: `return eventobjective.ReplaceTx(ctx, tx, e.ID, inputsOf(e.Objectives))` (com `if err := insertReminders(...); err != nil { return err }` antes).
- `Update`: o mesmo, depois de `insertReminders`.
- `inputsOf` (em `repository.go` ou `service.go`): converte `[]Objective` de volta em `[]eventobjective.Input`.
- `Find` e `ListUpcoming`: depois de ler os eventos, chamar um helper pequeno:

```go
// attachObjectives carrega os objetivos (e o meu progresso na ocorrência atual) dos eventos lidos.
func (r *Repository) attachObjectives(ctx context.Context, userID string, events []Event) error {
	refs := make([]eventobjective.EventRef, len(events))
	for i, e := range events {
		refs[i] = eventobjective.EventRef{EventID: e.ID, Occurrence: e.NextStartAt}
	}
	byEvent, err := eventobjective.LoadFor(ctx, r.db, userID, refs)
	if err != nil {
		return err
	}
	for i := range events {
		events[i].Objectives = byEvent[events[i].ID]
		if events[i].Objectives == nil {
			events[i].Objectives = []eventobjective.Objective{}
		}
	}
	return nil
}
```

No `Find`, depois do `scanEvent`: `one := []Event{e}; if err := r.attachObjectives(ctx, "", one); err != nil { return nil, err }; e = one[0]`. No `ListUpcoming`, antes do `return events, rows.Err()`: `if err := rows.Err(); err != nil { return nil, err }; return events, r.attachObjectives(ctx, userID, events)` (o `defer rows.Close()` continua valendo).

`handler.go`: acrescente `{eventobjective.ErrInvalidObjective, http.StatusBadRequest, "invalid_objective"},` na `errorTable` (importe o pacote).

- [ ] **Step 4: Ver passar**

Run: `cd backend && "$GO" vet ./internal/event/ && "$GO" test ./internal/event/ ./cmd/`
Expected: `ok` (os testes de banco rodam com `TEST_DATABASE_URL`). Depois `node scripts/crap.mjs --files backend/internal/event/service.go backend/internal/event/repository.go backend/internal/event/validate.go` com todas as funções ≤ 15.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/event
git commit -m "feat(eventos): o evento guarda e valida os objetivos"
```

---

### Task 4: Pontas fora do pacote e cálculo de quem pontua (puro)

**Files:**
- Modify: `backend/internal/call/snapshot.go` (campo `ChannelID`), `backend/internal/platform/websocket/activity.go` (`GameName`)
- Create: `backend/internal/eventobjective/eligible.go`, `backend/internal/eventobjective/tracker.go`
- Test: `backend/internal/call/snapshot_test.go`, `backend/internal/platform/websocket/activity_test.go`, `backend/internal/eventobjective/eligible_test.go`, `backend/internal/eventobjective/tracker_test.go`

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `call.CallSnapshot.ChannelID *string`
  - `func (h *Hub) GameName(userID string) string`
  - `type Target struct { ObjectiveID, EventID, ServerID, CallID string; Occurrence time.Time; Minutes int; Difficulty Difficulty }`
  - `type Room struct { EventID, ServerID string; ChannelID string; Occurrence time.Time; Game string; Going map[string]bool; Objectives []RoomObjective }`
  - `type RoomObjective struct { ID string; Kind Kind; Minutes int; Difficulty Difficulty }`
  - `type Contribution struct { UserID string; Target Target }`
  - `func Contributions(snaps []call.CallSnapshot, rooms map[string]Room, real map[string]bool, gameOf func(userID string) string) []Contribution` (`rooms` por id do canal de voz)
  - `func sameGame(activityName, eventGame string) bool` (sem acento, maiúsculas e espaços nas pontas)
  - `type tracker`, `newTracker(start time.Time) *tracker`, `(*tracker).accrue(cs []Contribution, now time.Time)`, `(*tracker).drain() []Drained`, `type Drained struct { UserID string; Target Target; Minutes int }`, `(*tracker).restore(d Drained)`

- [ ] **Step 1: Testes que falham**

`call/snapshot_test.go` (acrescente, no estilo de `TestCallSnapshotsCarryTheServer`): uma call de canal (`ChannelID = "canal-1"`) aparece em `CallSnapshots()` com `ChannelID` igual; uma call de DM tem `ChannelID == nil`.

`platform/websocket/activity_test.go`: depois de `hub.SetActivity("u1", &Activity{Name: "Minecraft", Kind: "game"})` com uma conexão aberta (use o helper de teste que o arquivo já usa para marcar presença), `hub.GameName("u1") == "Minecraft"`; sem atividade ou após `SetActivity("u1", nil)`, `""`.

`eligible_test.go`:

```go
package eventobjective

import (
	"testing"
	"time"

	"gin-quickstart/backend/internal/call"
)

func ptr(s string) *string { return &s }

func roomFor(channel string, game string, going ...string) Room {
	g := map[string]bool{}
	for _, id := range going {
		g[id] = true
	}
	return Room{
		EventID: "ev1", ServerID: "s1", ChannelID: channel, Occurrence: time.Date(2026, 12, 1, 20, 0, 0, 0, time.UTC),
		Game: game, Going: g,
		Objectives: []RoomObjective{
			{ID: "o-time", Kind: KindTime, Minutes: 30, Difficulty: Easy},
			{ID: "o-game", Kind: KindGame, Minutes: 30, Difficulty: Hard},
		},
	}
}

func ids(cs []Contribution) map[string]bool {
	out := map[string]bool{}
	for _, c := range cs {
		out[c.UserID+"/"+c.Target.ObjectiveID] = true
	}
	return out
}

func TestContributionsOnlyForEligibleGoingRealPeopleInTheRoom(t *testing.T) {
	snaps := []call.CallSnapshot{
		{CallID: "c1", ChannelID: ptr("voz"), Voice: []string{"ana", "bia", "caio", "dan"}},
		{CallID: "c2", ChannelID: ptr("outra"), Voice: []string{"ana"}},
		{CallID: "c3", Voice: []string{"ana"}}, // DM
	}
	rooms := map[string]Room{"voz": roomFor("voz", "Minecraft", "ana", "bia", "dan")}
	real := map[string]bool{"ana": true, "bia": true, "caio": true} // dan não é conta real
	games := map[string]string{"ana": "minecraft", "bia": "Valorant"}
	got := ids(Contributions(snaps, rooms, real, func(u string) string { return games[u] }))

	want := []string{"ana/o-time", "ana/o-game", "bia/o-time"}
	for _, w := range want {
		if !got[w] {
			t.Errorf("faltou %s em %v", w, got)
		}
	}
	for _, bad := range []string{"bia/o-game", "caio/o-time", "dan/o-time", "caio/o-game"} {
		if got[bad] {
			t.Errorf("não deveria contar %s", bad)
		}
	}
	if len(got) != 3 {
		t.Errorf("contribuições = %v", got)
	}
}

func TestContributionsSkipAwayAndMutedBecauseVoiceExcludesThem(t *testing.T) {
	// Voice já vem sem quem está AFK, mutado ou surdo: quem não está em Voice não conta.
	snaps := []call.CallSnapshot{{CallID: "c1", ChannelID: ptr("voz"), Voice: []string{"ana"}, Participants: []string{"ana", "bia"}, Away: []string{"bia"}}}
	rooms := map[string]Room{"voz": roomFor("voz", "", "ana", "bia")}
	got := ids(Contributions(snaps, rooms, map[string]bool{"ana": true, "bia": true}, func(string) string { return "" }))
	if got["bia/o-time"] || !got["ana/o-time"] {
		t.Errorf("contribuições = %v", got)
	}
}

func TestSameGameIgnoresCaseAccentsAndEdgeSpaces(t *testing.T) {
	cases := []struct {
		activity, event string
		want            bool
	}{
		{"Minecraft", "minecraft", true},
		{"  Counter-Strike 2 ", "counter-strike 2", true},
		{"Pokémon", "pokemon", true},
		{"Valorant", "Minecraft", false},
		{"", "Minecraft", false},
		{"Minecraft", "", false},
	}
	for _, c := range cases {
		if got := sameGame(c.activity, c.event); got != c.want {
			t.Errorf("sameGame(%q, %q) = %v", c.activity, c.event, got)
		}
	}
}
```

`tracker_test.go`:

```go
package eventobjective

import (
	"testing"
	"time"
)

func tg(obj string) Target {
	return Target{ObjectiveID: obj, EventID: "ev", Occurrence: time.Date(2026, 12, 1, 20, 0, 0, 0, time.UTC), Minutes: 30}
}

func TestTrackerDrainsWholeMinutesOnly(t *testing.T) {
	start := time.Date(2026, 12, 1, 20, 0, 0, 0, time.UTC)
	tr := newTracker(start)
	c := []Contribution{{UserID: "ana", Target: tg("o1")}}
	for i := 1; i <= 5; i++ { // 5 ticks de 10 s = 50 s
		tr.accrue(c, start.Add(time.Duration(i)*10*time.Second))
	}
	if got := tr.drain(); len(got) != 0 {
		t.Fatalf("50 s não fecham um minuto: %+v", got)
	}
	tr.accrue(c, start.Add(60*time.Second))
	got := tr.drain()
	if len(got) != 1 || got[0].Minutes != 1 || got[0].UserID != "ana" || got[0].Target.ObjectiveID != "o1" {
		t.Fatalf("drain = %+v", got)
	}
}

func TestTrackerLosesTheRestOfWhoLeft(t *testing.T) {
	start := time.Date(2026, 12, 1, 20, 0, 0, 0, time.UTC)
	tr := newTracker(start)
	c := []Contribution{{UserID: "ana", Target: tg("o1")}}
	tr.accrue(c, start.Add(40*time.Second))
	tr.drain()
	tr.accrue(nil, start.Add(50*time.Second)) // saiu
	tr.drain()
	tr.accrue(c, start.Add(60*time.Second)) // voltou: recomeça
	if got := tr.drain(); len(got) != 0 {
		t.Fatalf("quem saiu perde o resto do minuto: %+v", got)
	}
}

func TestTrackerRestoreGivesBackWhatCouldNotBeSaved(t *testing.T) {
	start := time.Date(2026, 12, 1, 20, 0, 0, 0, time.UTC)
	tr := newTracker(start)
	tr.restore(Drained{UserID: "ana", Target: tg("o1"), Minutes: 2})
	tr.accrue([]Contribution{{UserID: "ana", Target: tg("o1")}}, start.Add(10*time.Second))
	got := tr.drain()
	if len(got) != 1 || got[0].Minutes != 2 {
		t.Fatalf("restore deveria devolver 2 min: %+v", got)
	}
}

func TestTrackerIgnoresAFrozenServerGap(t *testing.T) {
	start := time.Date(2026, 12, 1, 20, 0, 0, 0, time.UTC)
	tr := newTracker(start)
	tr.accrue([]Contribution{{UserID: "ana", Target: tg("o1")}}, start.Add(5*time.Minute))
	if got := tr.drain(); len(got) != 0 {
		t.Fatalf("servidor parado não dá minutos de uma vez: %+v", got)
	}
}
```

- [ ] **Step 2: Ver falhar**

Run: `cd backend && "$GO" test ./internal/call/ ./internal/platform/websocket/ ./internal/eventobjective/`
Expected: FAIL (`unknown field ChannelID in CallSnapshot`, `undefined: Contributions`).

- [ ] **Step 3: Implementar**

`call/snapshot.go`: no struct, depois de `ServerID`:

```go
	// ChannelID: o canal de voz da chamada (nil em chamada de DM).
	ChannelID *string
```

e em `CallSnapshots()`, no literal: `ChannelID: ac.info.ChannelID,`.

`platform/websocket/activity.go`:

```go
// GameName: o jogo que a pessoa está jogando agora ("" = nenhum). Só leitura do
// que já está em memória; quem usa decide o que vale (o servidor não confia nele
// sozinho: ver docs/adr/0037).
func (h *Hub) GameName(userID string) string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if a := h.rich.games.get(userID); a != nil {
		return a.Name
	}
	return ""
}
```

`eventobjective/eligible.go`:

```go
package eventobjective

import (
	"strings"
	"time"

	"gin-quickstart/backend/internal/call"
)

// RoomObjective é o objetivo de um evento como a sala o vê.
type RoomObjective struct {
	ID         string
	Kind       Kind
	Minutes    int
	Difficulty Difficulty
}

// Room é a sala aberta de um evento em andamento, com quem disse Vou na
// ocorrência atual e os objetivos.
type Room struct {
	EventID, ServerID string
	ChannelID         string
	Occurrence        time.Time
	// Game: o jogo do evento ("" = sem jogo).
	Game       string
	Going      map[string]bool
	Objectives []RoomObjective
}

// Target é o objetivo de uma ocorrência: o que o tracker soma e o pagamento usa.
type Target struct {
	ObjectiveID, EventID, ServerID, CallID string
	Occurrence                             time.Time
	Minutes                                int
	Difficulty                             Difficulty
}

// Contribution é "esta pessoa conta tempo neste objetivo agora".
type Contribution struct {
	UserID string
	Target Target
}

// Contributions diz quem pontua em cada objetivo neste instante: está em Voice
// na call da sala do evento (já sem mute, surdez, call sozinho e AFK), tem Vou,
// é conta real e, no objetivo de jogo, a atividade dela é o jogo do evento.
func Contributions(snaps []call.CallSnapshot, rooms map[string]Room, real map[string]bool, gameOf func(userID string) string) []Contribution {
	var out []Contribution
	for _, s := range snaps {
		if s.ChannelID == nil {
			continue
		}
		room, ok := rooms[*s.ChannelID]
		if !ok {
			continue
		}
		for _, userID := range s.Voice {
			if !real[userID] || !room.Going[userID] {
				continue
			}
			out = append(out, personContributions(room, s.CallID, userID, gameOf)...)
		}
	}
	return out
}

func personContributions(room Room, callID, userID string, gameOf func(string) string) []Contribution {
	var out []Contribution
	for _, o := range room.Objectives {
		if o.Kind == KindGame && !sameGame(gameOf(userID), room.Game) {
			continue
		}
		out = append(out, Contribution{UserID: userID, Target: Target{
			ObjectiveID: o.ID, EventID: room.EventID, ServerID: room.ServerID, CallID: callID,
			Occurrence: room.Occurrence, Minutes: o.Minutes, Difficulty: o.Difficulty,
		}})
	}
	return out
}

// sameGame compara o jogo da atividade com o do evento sem ligar para
// maiúsculas, acentos e espaços nas pontas (a mesma regra do selo "Jogando" do app).
func sameGame(activityName, eventGame string) bool {
	a, b := foldGame(activityName), foldGame(eventGame)
	return a != "" && a == b
}

var accentFold = strings.NewReplacer(
	"á", "a", "à", "a", "â", "a", "ã", "a", "ä", "a",
	"é", "e", "è", "e", "ê", "e", "ë", "e",
	"í", "i", "ì", "i", "î", "i", "ï", "i",
	"ó", "o", "ò", "o", "ô", "o", "õ", "o", "ö", "o",
	"ú", "u", "ù", "u", "û", "u", "ü", "u", "ç", "c", "ñ", "n",
)

func foldGame(name string) string {
	return accentFold.Replace(strings.ToLower(strings.TrimSpace(name)))
}
```

`eventobjective/tracker.go`:

```go
package eventobjective

import "time"

// De quanto em quanto tempo o serviço olha as chamadas (o mesmo do XP de voz).
const tickInterval = 10 * time.Second

type key struct {
	userID, objectiveID string
	occurrence          int64
}

// Drained é o tempo pronto para gravar.
type Drained struct {
	UserID  string
	Target  Target
	Minutes int
}

// tracker soma, em memória, o tempo de cada pessoa em cada objetivo da
// ocorrência (molde de serverlevel/tracker.go). Não sabe de banco: o serviço
// drena e grava.
type tracker struct {
	lastTick time.Time
	pending  map[key]time.Duration
	meta     map[key]Target
	// touched: quem somou desde o último drain (o resto de quem saiu some).
	touched map[key]bool
}

func newTracker(start time.Time) *tracker {
	return &tracker{
		lastTick: start,
		pending:  make(map[key]time.Duration),
		meta:     make(map[key]Target),
		touched:  make(map[key]bool),
	}
}

func keyOf(userID string, t Target) key {
	return key{userID, t.ObjectiveID, t.Occurrence.UnixNano()}
}

// accrue soma o tempo desde o último tick a quem contribui agora.
func (t *tracker) accrue(cs []Contribution, now time.Time) {
	elapsed := now.Sub(t.lastTick)
	t.lastTick = now
	// Servidor travado/suspenso: não dá de uma vez o tempo que ninguém viu.
	if elapsed > 2*tickInterval || elapsed < 0 {
		elapsed = tickInterval
	}
	for _, c := range cs {
		k := keyOf(c.UserID, c.Target)
		t.pending[k] += elapsed
		t.meta[k] = c.Target
		t.touched[k] = true
	}
}

// drain devolve os minutos completos. O resto (< 1 min) fica para o próximo,
// só de quem continua somando: quem saiu perde o que não fechou.
func (t *tracker) drain() []Drained {
	var out []Drained
	for k, d := range t.pending {
		if !t.touched[k] {
			delete(t.pending, k)
			delete(t.meta, k)
			continue
		}
		minutes := int(d / time.Minute)
		t.pending[k] = d - time.Duration(minutes)*time.Minute
		if minutes > 0 {
			out = append(out, Drained{UserID: k.userID, Target: t.meta[k], Minutes: minutes})
		}
	}
	t.touched = make(map[key]bool)
	return out
}

// restore devolve o tempo que não conseguiu ser gravado, para ir no próximo flush.
func (t *tracker) restore(d Drained) {
	k := keyOf(d.UserID, d.Target)
	t.pending[k] += time.Duration(d.Minutes) * time.Minute
	t.meta[k] = d.Target
	t.touched[k] = true
}
```

- [ ] **Step 4: Ver passar**

Run: `cd backend && "$GO" vet ./internal/call/ ./internal/platform/websocket/ ./internal/eventobjective/ && "$GO" test ./internal/call/ ./internal/platform/websocket/ ./internal/eventobjective/`
Expected: `ok`.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/call/snapshot.go backend/internal/call/snapshot_test.go backend/internal/platform/websocket backend/internal/eventobjective
git commit -m "feat(eventos): quem pontua em cada objetivo e o contador de minutos"
```

---

### Task 5: Pagamento em transação única (XP pessoal, XP do servidor e tetos)

**Files:**
- Create: `backend/migrations/000184_event_server_level_source.up.sql`, `backend/migrations/000184_event_server_level_source.down.sql`, `backend/internal/level/repository_bonus.go`, `backend/internal/eventobjective/repository_pay.go`
- Modify: `backend/internal/level/service.go` (extrair `Announce` de `give`), `backend/internal/serverlevel/sources.go` (fonte `evento`)
- Test: `backend/internal/level/service_test.go`, `backend/internal/level/repository_bonus_db_test.go`, `backend/internal/serverlevel/sources_test.go` (ou o teste da lista de fontes que já existir), `backend/internal/eventobjective/repository_pay_db_test.go`

**Interfaces:**
- Consumes: Tasks 1, 2 e 4 (`Target`, `PersonalXP`, `ServerXP`, `DailyPersonalCap`).
- Produces:
  - `func level.AddBonusXPTx(ctx context.Context, q interface{ QueryRow(context.Context, string, ...any) pgx.Row }, userID string, xp int64) (totalXP, voiceSeconds int64, err error)`
  - `func (s *Service) Announce(userID string, totalXP, totalSeconds, xp int64, callID string, serverID *string)` (em `level`)
  - `serverlevel.SourceEvent = "evento"` (e na lista `Sources`)
  - `type Payment struct { UserID string; Target Target }`
  - `type Receipt struct { Personal, Server, TotalXP, VoiceSeconds int64; Capped bool }`
  - `func (r *Repository) Complete(ctx context.Context, p Payment) (Receipt, bool, error)` (`bool` = pagou agora; `false` sem erro = já pago ou meta não atingida)

- [ ] **Step 1: Migration do teto do servidor**

`000184_event_server_level_source.up.sql`:

```sql
-- Fonte "evento" do XP do servidor: objetivos de evento cumpridos, até 300 por
-- pessoa por dia, sem competir com o teto da voz (ADR 0037).
CREATE OR REPLACE FUNCTION server_level_cap(p_source TEXT) RETURNS int AS $$
    SELECT CASE p_source
        WHEN 'membros' THEN 50
        WHEN 'mensagens' THEN 100
        WHEN 'figurinhas' THEN 50
        WHEN 'sons' THEN 50
        WHEN 'voz' THEN 120
        WHEN 'live' THEN 60
        WHEN 'espectador' THEN 60
        WHEN 'presenca' THEN 60
        WHEN 'evento' THEN 300
        ELSE 0
    END
$$ LANGUAGE sql IMMUTABLE;
```

`.down.sql`: o mesmo `CREATE OR REPLACE` sem a linha `WHEN 'evento'`.

Aplique no banco de teste como na Task 2.

- [ ] **Step 2: Testes que falham**

`level/service_test.go` (acrescente, no estilo dos testes de `give` que o arquivo já tem, com o publisher falso dele):

```go
func TestAnnounceSendsUpdateAndLevelUp(t *testing.T) {
	pub := &fakePublisher{} // o falso que os outros testes do arquivo já usam
	s := LevelService(nil, pub, nil)
	server := "s1"
	// 475 XP é o custo do nível 5: de 400 para 900 sobe de nível.
	s.Announce("u1", 900, 120, 500, "call-1", &server)
	if !pub.sentTo("u1", "level:update") {
		t.Error("a pessoa deveria receber level:update")
	}
	if !pub.broadcastCall("call-1", "level:up") || !pub.broadcastRoom("server:s1", "level:up") {
		t.Error("subir de nível avisa a call e o servidor")
	}
	pub.reset()
	s.Announce("u1", 910, 120, 10, "call-1", &server) // mesmo nível
	if pub.broadcastCall("call-1", "level:up") {
		t.Error("sem subir de nível não há level:up")
	}
}
```

(Use os nomes reais do falso do arquivo; se ele não tem `sentTo`/`broadcast*`, escreva o falso mínimo no teste.)

`level/repository_bonus_db_test.go`: `AddBonusXPTx` numa conexão do pool soma o XP sem mexer em `voice_seconds`, devolve os totais, e duas chamadas somam.

`serverlevel`: o teste que confere `Sources` ganha `SourceEvent` ("evento") na lista.

`eventobjective/repository_pay_db_test.go`:

```go
package eventobjective

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// payFixture cria evento + objetivo (Fácil, 15 min) e deixa a pessoa com a meta batida.
func payFixture(t *testing.T, db *pgxpool.Pool, d Difficulty) (Payment, *Repository) {
	t.Helper()
	userID, serverID, eventID := seedEvent(t, db)
	occ := time.Now().UTC().Truncate(time.Second)
	ctx := context.Background()
	if err := pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		return ReplaceTx(ctx, tx, eventID, []Input{{KindTime, d, 15}})
	}); err != nil {
		t.Fatal(err)
	}
	obj := mustLoad(t, db, userID, []EventRef{{eventID, occ}})[0]
	repo := NewRepository(db)
	if _, err := repo.AddMinutes(ctx, obj.ID, userID, occ, 15); err != nil {
		t.Fatal(err)
	}
	return Payment{UserID: userID, Target: Target{
		ObjectiveID: obj.ID, EventID: eventID, ServerID: serverID, Occurrence: occ, Minutes: 15, Difficulty: d,
	}}, repo
}

func personalXP(t *testing.T, db *pgxpool.Pool, userID string) int64 {
	t.Helper()
	var xp int64
	_ = db.QueryRow(context.Background(), `SELECT COALESCE((SELECT xp FROM user_levels WHERE user_id = $1), 0)`, userID).Scan(&xp)
	return xp
}

func serverXP(t *testing.T, db *pgxpool.Pool, serverID string) int64 {
	t.Helper()
	var xp int64
	_ = db.QueryRow(context.Background(), `SELECT COALESCE((SELECT xp FROM server_levels WHERE server_id = $1), 0)`, serverID).Scan(&xp)
	return xp
}

func TestCompletePaysOnceBothXPs(t *testing.T) {
	db, ctx := testDB(t)
	p, repo := payFixture(t, db, Easy)
	rec, paid, err := repo.Complete(ctx, p)
	if err != nil || !paid {
		t.Fatalf("pagou = %v (%v)", paid, err)
	}
	if rec.Personal != 1000 || rec.Server != 50 || rec.Capped {
		t.Errorf("recibo = %+v", rec)
	}
	if got := personalXP(t, db, p.UserID); got != 1000 {
		t.Errorf("XP pessoal = %d", got)
	}
	if got := serverXP(t, db, p.Target.ServerID); got != 50 {
		t.Errorf("XP do servidor = %d", got)
	}
	// De novo: não paga.
	if _, paid, err := repo.Complete(ctx, p); err != nil || paid {
		t.Errorf("segunda tentativa: pagou = %v (%v)", paid, err)
	}
	if got := personalXP(t, db, p.UserID); got != 1000 {
		t.Errorf("XP pessoal não pode dobrar: %d", got)
	}
}

func TestCompleteIsAtomicUnderConcurrency(t *testing.T) {
	db, ctx := testDB(t)
	p, repo := payFixture(t, db, Easy)
	var wg sync.WaitGroup
	var mu sync.Mutex
	paidCount := 0
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, paid, err := repo.Complete(ctx, p); err == nil && paid {
				mu.Lock()
				paidCount++
				mu.Unlock()
			}
		}()
	}
	wg.Wait()
	if paidCount != 1 {
		t.Fatalf("pagou %d vezes, esperava 1", paidCount)
	}
	if got := personalXP(t, db, p.UserID); got != 1000 {
		t.Errorf("XP pessoal = %d", got)
	}
}

func TestCompleteNeedsTheGoalReached(t *testing.T) {
	db, ctx := testDB(t)
	p, repo := payFixture(t, db, Easy)
	// Meta de 30 min, só 15 gravados: não paga.
	mustExec(t, db, `UPDATE event_objectives SET minutes = 30 WHERE id = $1`, p.Target.ObjectiveID)
	if _, paid, err := repo.Complete(ctx, p); err != nil || paid {
		t.Fatalf("pagou = %v (%v) sem bater a meta", paid, err)
	}
}

func TestCompleteStopsAtTheDailyPersonalCap(t *testing.T) {
	db, ctx := testDB(t)
	p, repo := payFixture(t, db, Hard) // 6.000
	mustExec(t, db, `INSERT INTO event_xp_daily (user_id, day, xp) VALUES ($1, server_level_today(), 5000)`, p.UserID)
	rec, paid, err := repo.Complete(ctx, p)
	if err != nil || !paid {
		t.Fatalf("pagou = %v (%v)", paid, err)
	}
	if rec.Personal != 1000 || !rec.Capped {
		t.Errorf("deveria pagar só os 1.000 que cabem: %+v", rec)
	}
	if got := personalXP(t, db, p.UserID); got != 1000 {
		t.Errorf("XP pessoal = %d", got)
	}
	// Teto cheio: paga 0 mas conta como cumprido.
	p2, _ := payFixture(t, db, Easy)
	mustExec(t, db, `INSERT INTO event_xp_daily (user_id, day, xp) VALUES ($1, server_level_today(), 6000)`, p2.UserID)
	rec, paid, err = repo.Complete(ctx, p2)
	if err != nil || !paid || rec.Personal != 0 || !rec.Capped {
		t.Fatalf("teto cheio: recibo %+v pagou=%v (%v)", rec, paid, err)
	}
	var done bool
	_ = db.QueryRow(ctx, `SELECT completed_at IS NOT NULL FROM event_objective_progress WHERE objective_id = $1 AND user_id = $2`,
		p2.Target.ObjectiveID, p2.UserID).Scan(&done)
	if !done {
		t.Error("o objetivo conta como cumprido mesmo com o teto cheio")
	}
}

func TestCompleteServerCapIs300PerDay(t *testing.T) {
	db, ctx := testDB(t)
	p, repo := payFixture(t, db, Hard) // servidor 300
	if _, paid, err := repo.Complete(ctx, p); err != nil || !paid {
		t.Fatalf("pagou = %v (%v)", paid, err)
	}
	if got := serverXP(t, db, p.Target.ServerID); got != 300 {
		t.Errorf("XP do servidor = %d, esperava 300", got)
	}
	// Mais um no mesmo dia, mesma pessoa e servidor: o teto de 300 já foi.
	obj2 := newObjectiveFor(t, db, p, Easy)
	if _, paid, err := repo.Complete(ctx, obj2); err != nil || !paid {
		t.Fatalf("segundo: pagou = %v (%v)", paid, err)
	}
	if got := serverXP(t, db, p.Target.ServerID); got != 300 {
		t.Errorf("o teto do servidor cortou: %d", got)
	}
}
```

> `newObjectiveFor(t, db, p, d)`: helper de teste que insere outro objetivo (`d`, 15 min) no mesmo evento, grava 15 minutos para a mesma pessoa e devolve um `Payment` para ele. Escreva-o no mesmo arquivo de teste.

Um teste de rollback: faça `Complete` falhar no meio (ex.: `Payment` com `Target.ServerID` de um servidor que não existe faz `server_level_add` não somar nada mas não falha; então simule a falha apontando `UserID` para uma pessoa inexistente) e confirme que `completed_at` continua nulo e nenhum XP entrou (`TestCompleteRollsBackOnFailure`).

- [ ] **Step 3: Ver falhar**

Run: `cd backend && "$GO" test ./internal/level/ ./internal/serverlevel/ ./internal/eventobjective/`
Expected: FAIL (`undefined: Announce`, `undefined: Complete`, `SourceEvent`).

- [ ] **Step 4: Implementar**

`level/repository_bonus.go`:

```go
package level

import (
	"context"

	"github.com/jackc/pgx/v5"
)

// queryRower é o que AddBonusXPTx precisa (uma transação ou o pool).
type queryRower interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// AddBonusXPTx soma XP sem tempo de voz (bônus de evento) dentro da transação de
// quem chama e devolve os totais atualizados.
func AddBonusXPTx(ctx context.Context, q queryRower, userID string, xp int64) (totalXP, voiceSeconds int64, err error) {
	err = q.QueryRow(ctx, `
		INSERT INTO user_levels (user_id, xp, voice_seconds)
		VALUES ($1, $2, 0)
		ON CONFLICT (user_id) DO UPDATE SET
			xp = user_levels.xp + EXCLUDED.xp,
			updated_at = NOW()
		RETURNING xp, voice_seconds`, userID, xp).Scan(&totalXP, &voiceSeconds)
	return totalXP, voiceSeconds, err
}
```

`level/service.go`: extraia o fim de `give` (a partir de `progress := newProgress(...)`) para o método público `Announce`, e deixe `give` chamando-o:

```go
func (s *Service) give(ctx context.Context, g grant) {
	userID := g.activity.UserID
	xp := g.xp
	if xp == 0 {
		return
	}
	totalXP, totalSeconds, err := s.store.AddVoiceXP(ctx, userID, xp, g.minutes*60)
	if err != nil {
		log.Printf("[level] add xp for %s: %v", userID, err)
		return
	}
	s.Announce(userID, totalXP, totalSeconds, xp, g.activity.CallID, g.activity.ServerID)
}

// Announce avisa o app do XP que a pessoa acabou de ganhar (level:update) e, se
// isso fez o nível subir, da subida (level:up) para a call, o servidor e ela.
// Serve ao XP de voz e ao bônus dos eventos.
func (s *Service) Announce(userID string, totalXP, totalSeconds, xp int64, callID string, serverID *string) {
	progress := newProgress(userID, totalXP, totalSeconds)
	s.publisher.SendToUser(userID, marshalEvent("level:update", progress))

	previous, _, _ := FromXP(totalXP - xp)
	if progress.Level == previous {
		return
	}
	event := marshalEvent("level:up", LevelUpEvent{
		UserID:        userID,
		Level:         progress.Level,
		PreviousLevel: previous,
		CallID:        callID,
		ServerID:      serverID,
	})
	s.publisher.BroadcastToCall(callID, event)
	if serverID != nil {
		s.publisher.BroadcastToRoom("server:"+*serverID, event)
	}
	s.publisher.SendToUser(userID, event)
}
```

(Se `LevelUpEvent.ServerID` for `*string`, mantenha como está hoje; confira o tipo no `model.go` do `level` e ajuste a assinatura.)

`serverlevel/sources.go`: `SourceEvent = "evento"`, e `SourceEvent` ao fim de `Sources` (o rótulo "evento" não entra em `xpPerMinute`: não é fonte de tempo). Atualize também `frontend/.../serverlevel/lib/serverLevel.ts` na Task 8 (rótulo do detalhamento).

`eventobjective/repository_pay.go`:

```go
package eventobjective

import (
	"context"
	"fmt"

	"gin-quickstart/backend/internal/level"

	"github.com/jackc/pgx/v5"
)

// Payment é o objetivo cumprido a pagar.
type Payment struct {
	UserID string
	Target Target
}

// Receipt é o que foi pago de fato (depois dos tetos).
type Receipt struct {
	Personal, Server int64
	// TotalXP e VoiceSeconds: os totais da pessoa depois do pagamento (para o aviso de nível).
	TotalXP, VoiceSeconds int64
	// Capped: o teto diário cortou parte do XP pessoal.
	Capped bool
}

// Complete paga o objetivo numa transação só: marca a conclusão (só um pedido
// ganha), aplica o teto pessoal do dia, soma o XP pessoal e o do servidor. O
// segundo valor é false, sem erro, se já estava pago ou a meta não foi batida.
func (r *Repository) Complete(ctx context.Context, p Payment) (Receipt, bool, error) {
	var rec Receipt
	paid := false
	err := pgx.BeginFunc(ctx, r.db, func(tx pgx.Tx) error {
		claimed, err := claim(ctx, tx, p)
		if err != nil || !claimed {
			return err
		}
		paid = true
		want := PersonalXP(p.Target.Difficulty)
		if rec.Personal, err = takeFromDailyCap(ctx, tx, p.UserID, want); err != nil {
			return err
		}
		rec.Capped = rec.Personal < want
		if err := payPersonal(ctx, tx, p.UserID, &rec); err != nil {
			return err
		}
		if err := tx.QueryRow(ctx, `SELECT server_level_add($1, $2, 'evento', $3)`,
			p.Target.ServerID, p.UserID, int(ServerXP(p.Target.Difficulty))).Scan(&rec.Server); err != nil {
			return fmt.Errorf("xp do servidor: %w", err)
		}
		_, err = tx.Exec(ctx, `UPDATE event_objective_progress SET xp_paid = $4
			WHERE objective_id = $1 AND user_id = $2 AND occurrence_at = $3`,
			p.Target.ObjectiveID, p.UserID, p.Target.Occurrence, int(rec.Personal))
		return err
	})
	if err != nil {
		return Receipt{}, false, err
	}
	return rec, paid, nil
}

// claim marca o objetivo como cumprido se a meta foi batida e ainda não estava.
func claim(ctx context.Context, tx pgx.Tx, p Payment) (bool, error) {
	tag, err := tx.Exec(ctx, `
		UPDATE event_objective_progress pr SET completed_at = NOW()
		FROM event_objectives o
		WHERE pr.objective_id = $1 AND pr.user_id = $2 AND pr.occurrence_at = $3
		  AND pr.completed_at IS NULL AND o.id = pr.objective_id AND pr.minutes >= o.minutes`,
		p.Target.ObjectiveID, p.UserID, p.Target.Occurrence)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}

// takeFromDailyCap reserva do teto pessoal do dia até `want` XP e devolve quanto coube.
func takeFromDailyCap(ctx context.Context, tx pgx.Tx, userID string, want int64) (int64, error) {
	if _, err := tx.Exec(ctx, `
		INSERT INTO event_xp_daily (user_id, day, xp) VALUES ($1, server_level_today(), 0)
		ON CONFLICT DO NOTHING`, userID); err != nil {
		return 0, err
	}
	var used int64
	if err := tx.QueryRow(ctx, `
		SELECT xp FROM event_xp_daily WHERE user_id = $1 AND day = server_level_today() FOR UPDATE`, userID).Scan(&used); err != nil {
		return 0, err
	}
	granted := min(want, max(DailyPersonalCap-used, 0))
	_, err := tx.Exec(ctx, `UPDATE event_xp_daily SET xp = xp + $2 WHERE user_id = $1 AND day = server_level_today()`,
		userID, int(granted))
	return granted, err
}

// payPersonal soma o XP pessoal (se coube algum) e guarda os totais no recibo.
func payPersonal(ctx context.Context, tx pgx.Tx, userID string, rec *Receipt) error {
	if rec.Personal == 0 {
		return nil
	}
	var err error
	rec.TotalXP, rec.VoiceSeconds, err = level.AddBonusXPTx(ctx, tx, userID, rec.Personal)
	return err
}
```

- [ ] **Step 5: Ver passar**

Run: `cd backend && "$GO" vet ./internal/level/ ./internal/serverlevel/ ./internal/eventobjective/ && "$GO" test ./internal/level/ ./internal/serverlevel/ ./internal/eventobjective/ && cd .. && node scripts/check-migrations.mjs && node scripts/crap.mjs --files backend/internal/level/service.go backend/internal/eventobjective/repository_pay.go backend/internal/level/repository_bonus.go`
Expected: `ok`; nenhuma função **tocada** acima de 15 (`level.Service.Run` e `Repository.FindByUserIDs` já passavam e não foram editadas; confira que `give` ficou ≤ 15).

- [ ] **Step 6: Commit**

```bash
git add backend/migrations/000184_* backend/internal/level backend/internal/serverlevel backend/internal/eventobjective
git commit -m "feat(eventos): pagamento do objetivo em transação única, com os tetos diários"
```

---

### Task 6: O ticker, o aviso `event:objective` e a ligação

**Files:**
- Create: `backend/internal/eventobjective/service.go`, `backend/internal/eventobjective/repository_rooms.go`, `backend/internal/eventobjective/events.go`, `backend/cmd/wire_event_objectives.go`
- Modify: `backend/cmd/wire.go` (campo `levelService` e ordem), `backend/cmd/wire_engagement.go` (guardar `a.levelService`)
- Test: `backend/internal/eventobjective/service_test.go`, `backend/internal/eventobjective/service_db_test.go`, `backend/internal/eventobjective/repository_rooms_db_test.go`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces:
  - `type CallSource interface{ CallSnapshots() []call.CallSnapshot }`
  - `type RealAccounts interface{ Lookup(ctx context.Context, ids []string, now time.Time) map[string]bool }`
  - `type GameSource interface{ GameName(userID string) string }`
  - `type Publisher interface{ SendToUser(userID string, event []byte) }`
  - `type Announcer interface{ Announce(userID string, totalXP, totalSeconds, xp int64, callID string, serverID *string) }`
  - `type store interface { RunningRooms(ctx) ([]Room, error); AddMinutes(...) (int, error); Complete(ctx, Payment) (Receipt, bool, error) }`
  - `func NewService(repo *Repository, calls CallSource, real RealAccounts, games GameSource, pub Publisher, level Announcer) *Service` e `(*Service).Run(ctx context.Context)`
  - `(*Repository).RunningRooms(ctx context.Context) ([]Room, error)`
  - evento `event:objective` com `ProgressEvent{ServerID, EventID, ObjectiveID string; Minutes int; Done bool; XP int64; Capped bool}`

- [ ] **Step 1: Testes que falham**

`repository_rooms_db_test.go`: com um evento que tem objetivos, sala aberta (`UPDATE server_events SET voice_channel_id = <canal>` num canal real do servidor; copie o INSERT de canal do `event/rooms_db_test.go`) e dois Vou (`event_rsvps` com `occurrence_start = next_start_at`), `RunningRooms` devolve uma `Room` com `ChannelID`, `Occurrence = next_start_at`, `Game` (do `game_name`, `""` se nulo), `Going` só de quem disse Vou (uma pessoa com `going = false` fora) e os `Objectives` na ordem; evento sem objetivos, cancelado, encerrado ou sem sala aberta não aparece.

`service_test.go` (com falsos; sem banco):

```go
package eventobjective

import (
	"context"
	"testing"
	"time"

	"gin-quickstart/backend/internal/call"
)

type fakeCalls struct{ snaps []call.CallSnapshot }

func (f fakeCalls) CallSnapshots() []call.CallSnapshot { return f.snaps }

type fakeReal map[string]bool

func (f fakeReal) Lookup(_ context.Context, ids []string, _ time.Time) map[string]bool { return f }

type fakeGames map[string]string

func (f fakeGames) GameName(userID string) string { return f[userID] }

type fakePub struct{ sent []string }

func (f *fakePub) SendToUser(userID string, event []byte) { f.sent = append(f.sent, userID+":"+string(event)) }

type fakeAnnouncer struct{ calls int }

func (f *fakeAnnouncer) Announce(string, int64, int64, int64, string, *string) { f.calls++ }

type fakeStore struct {
	rooms     []Room
	minutes   map[string]int // objectiveID|userID → total
	completed int
	failPay   bool
}

func (f *fakeStore) RunningRooms(context.Context) ([]Room, error) { return f.rooms, nil }

func (f *fakeStore) AddMinutes(_ context.Context, obj, user string, _ time.Time, m int) (int, error) {
	if f.minutes == nil {
		f.minutes = map[string]int{}
	}
	f.minutes[obj+"|"+user] += m
	return f.minutes[obj+"|"+user], nil
}

func (f *fakeStore) Complete(context.Context, Payment) (Receipt, bool, error) {
	if f.failPay {
		return Receipt{}, false, context.DeadlineExceeded
	}
	f.completed++
	return Receipt{Personal: 1000, Server: 50, TotalXP: 1000}, true, nil
}

func newTestService(st *fakeStore, snaps []call.CallSnapshot, start time.Time) (*Service, *fakePub, *fakeAnnouncer) {
	pub, ann := &fakePub{}, &fakeAnnouncer{}
	s := newService(st, fakeCalls{snaps}, fakeReal{"ana": true}, fakeGames{}, pub, ann, start)
	return s, pub, ann
}

func oneRoom() []Room {
	r := roomFor("voz", "", "ana")
	r.Objectives = []RoomObjective{{ID: "o1", Kind: KindTime, Minutes: 2, Difficulty: Easy}}
	return []Room{r}
}

func TestTickAddsMinutesAndPaysWhenGoalIsReached(t *testing.T) {
	start := time.Date(2026, 12, 1, 20, 0, 0, 0, time.UTC)
	st := &fakeStore{rooms: oneRoom()}
	snaps := []call.CallSnapshot{{CallID: "c1", ChannelID: ptr("voz"), Voice: []string{"ana"}}}
	s, pub, ann := newTestService(st, snaps, start)
	ctx := context.Background()
	for i := 1; i <= 6; i++ { // 60 s: 1 min
		s.tick(ctx, start.Add(time.Duration(i)*10*time.Second))
	}
	if st.minutes["o1|ana"] != 1 || st.completed != 0 {
		t.Fatalf("1 min: minutos=%d pagos=%d", st.minutes["o1|ana"], st.completed)
	}
	for i := 7; i <= 12; i++ { // mais 60 s: 2 min = meta
		s.tick(ctx, start.Add(time.Duration(i)*10*time.Second))
	}
	if st.completed != 1 || ann.calls != 1 {
		t.Fatalf("pagos=%d avisos de nível=%d", st.completed, ann.calls)
	}
	if len(pub.sent) < 2 {
		t.Errorf("a pessoa recebe o progresso a cada minuto e o fim: %v", pub.sent)
	}
}

func TestTickRetriesAFailedPaymentWhileThePersonLeft(t *testing.T) {
	start := time.Date(2026, 12, 1, 20, 0, 0, 0, time.UTC)
	st := &fakeStore{rooms: oneRoom(), failPay: true}
	snaps := []call.CallSnapshot{{CallID: "c1", ChannelID: ptr("voz"), Voice: []string{"ana"}}}
	s, _, _ := newTestService(st, snaps, start)
	ctx := context.Background()
	for i := 1; i <= 12; i++ {
		s.tick(ctx, start.Add(time.Duration(i)*10*time.Second))
	}
	if st.completed != 0 {
		t.Fatal("o pagamento falhou, ainda não pagou")
	}
	// A pessoa saiu da sala e o banco voltou: o próximo tick refaz o pagamento.
	s.calls = fakeCalls{nil}
	st.failPay = false
	s.tick(ctx, start.Add(130*time.Second))
	if st.completed != 1 {
		t.Fatalf("pagos = %d, esperava 1 depois de repetir", st.completed)
	}
}

func TestTickSkipsTheDatabaseWithoutEventCalls(t *testing.T) {
	start := time.Date(2026, 12, 1, 20, 0, 0, 0, time.UTC)
	st := &fakeStore{rooms: oneRoom()}
	snaps := []call.CallSnapshot{{CallID: "dm", Voice: []string{"ana"}}}
	s, _, _ := newTestService(st, snaps, start)
	s.tick(context.Background(), start.Add(10*time.Second))
	if len(st.minutes) != 0 {
		t.Errorf("call de DM não gera progresso: %v", st.minutes)
	}
}
```

(`roomFor` e `ptr` vêm do `eligible_test.go`, Task 4.)

`service_db_test.go`: um passeio com o banco de verdade: evento com objetivo Fácil de 15 min, sala e Vou, `Service` com `fakeCalls`/`fakeReal` e o `Repository` de verdade, 15 ticks de 60 s fechando 15 minutos: o XP pessoal sobe 1.000 e o do servidor 50 uma só vez; mais ticks não pagam de novo.

- [ ] **Step 2: Ver falhar**

Run: `cd backend && "$GO" test ./internal/eventobjective/ -run 'Tick|RunningRooms|Service'`
Expected: FAIL (`undefined: newService`, `undefined: RunningRooms`).

- [ ] **Step 3: Implementar**

`repository_rooms.go`:

```go
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
```

(São 2 consultas por sala por tick; salas com objetivos são poucas. Se virar problema, junte-as; **meça antes** (memória do repo: contar consultas com Postgres real).)

`events.go`:

```go
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
```

`service.go`:

```go
package eventobjective

import (
	"context"
	"log"
	"time"

	"gin-quickstart/backend/internal/call"
)

type CallSource interface{ CallSnapshots() []call.CallSnapshot }

type RealAccounts interface {
	Lookup(ctx context.Context, ids []string, now time.Time) map[string]bool
}

type GameSource interface{ GameName(userID string) string }

type Publisher interface{ SendToUser(userID string, event []byte) }

type Announcer interface {
	Announce(userID string, totalXP, totalSeconds, xp int64, callID string, serverID *string)
}

type store interface {
	RunningRooms(ctx context.Context) ([]Room, error)
	AddMinutes(ctx context.Context, objectiveID, userID string, occurrence time.Time, minutes int) (int, error)
	Complete(ctx context.Context, p Payment) (Receipt, bool, error)
}

// Service conta o tempo dos objetivos olhando as calls das salas dos eventos e
// paga quem cumpre (ADR 0037).
type Service struct {
	store   store
	calls   CallSource
	real    RealAccounts
	games   GameSource
	pub     Publisher
	level   Announcer
	tracker *tracker
	// retry: pagamentos que falharam (a pessoa pode já ter saído da sala).
	retry map[key]Payment
}

func NewService(repo *Repository, calls CallSource, real RealAccounts, games GameSource, pub Publisher, level Announcer) *Service {
	return newService(repo, calls, real, games, pub, level, time.Now())
}

func newService(st store, calls CallSource, real RealAccounts, games GameSource, pub Publisher, level Announcer, start time.Time) *Service {
	return &Service{store: st, calls: calls, real: real, games: games, pub: pub, level: level,
		tracker: newTracker(start), retry: make(map[key]Payment)}
}

// Run conta o tempo dos objetivos até ctx acabar.
func (s *Service) Run(ctx context.Context) {
	ticker := time.NewTicker(tickInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			s.tick(ctx, now)
		}
	}
}

func (s *Service) tick(ctx context.Context, now time.Time) {
	s.retryPayments(ctx)
	s.tracker.accrue(s.contributions(ctx, now), now)
	for _, d := range s.tracker.drain() {
		s.record(ctx, d)
	}
}

// contributions descobre quem pontua agora. Só consulta o banco se houver call
// de canal; sem sala de evento nas calls, ninguém soma.
func (s *Service) contributions(ctx context.Context, now time.Time) []Contribution {
	snaps := s.calls.CallSnapshots()
	if !anyChannelCall(snaps) {
		return nil
	}
	rooms, err := s.store.RunningRooms(ctx)
	if err != nil {
		log.Printf("[eventobjective] salas: %v", err)
		return nil
	}
	byChannel := make(map[string]Room, len(rooms))
	for _, r := range rooms {
		byChannel[r.ChannelID] = r
	}
	people := voicePeople(snaps, byChannel)
	if len(people) == 0 {
		return nil
	}
	return Contributions(snaps, byChannel, s.real.Lookup(ctx, people, now), s.games.GameName)
}

func anyChannelCall(snaps []call.CallSnapshot) bool {
	for _, c := range snaps {
		if c.ChannelID != nil {
			return true
		}
	}
	return false
}

// voicePeople: quem está em Voice nas calls das salas de evento (sem repetir).
func voicePeople(snaps []call.CallSnapshot, rooms map[string]Room) []string {
	seen := map[string]bool{}
	var out []string
	for _, c := range snaps {
		if c.ChannelID == nil {
			continue
		}
		if _, ok := rooms[*c.ChannelID]; !ok {
			continue
		}
		for _, id := range c.Voice {
			if !seen[id] {
				seen[id] = true
				out = append(out, id)
			}
		}
	}
	return out
}

// record grava os minutos e, se a meta foi batida, paga.
func (s *Service) record(ctx context.Context, d Drained) {
	total, err := s.store.AddMinutes(ctx, d.Target.ObjectiveID, d.UserID, d.Target.Occurrence, d.Minutes)
	if err != nil {
		log.Printf("[eventobjective] gravar minutos: %v", err)
		s.tracker.restore(d)
		return
	}
	if total < d.Target.Minutes {
		s.send(d.UserID, ProgressEvent{ServerID: d.Target.ServerID, EventID: d.Target.EventID,
			ObjectiveID: d.Target.ObjectiveID, Minutes: total})
		return
	}
	s.pay(ctx, Payment{UserID: d.UserID, Target: d.Target}, total)
}

// pay tenta pagar; se falhar, guarda para repetir no próximo tick.
func (s *Service) pay(ctx context.Context, p Payment, minutes int) {
	rec, paid, err := s.store.Complete(ctx, p)
	k := keyOf(p.UserID, p.Target)
	if err != nil {
		log.Printf("[eventobjective] pagar: %v", err)
		s.retry[k] = p
		return
	}
	delete(s.retry, k)
	if !paid {
		return
	}
	if rec.Personal > 0 {
		sid := p.Target.ServerID
		s.level.Announce(p.UserID, rec.TotalXP, rec.VoiceSeconds, rec.Personal, p.Target.CallID, &sid)
	}
	s.send(p.UserID, ProgressEvent{ServerID: p.Target.ServerID, EventID: p.Target.EventID,
		ObjectiveID: p.Target.ObjectiveID, Minutes: minutes, Done: true, XP: rec.Personal, Capped: rec.Capped})
}

func (s *Service) retryPayments(ctx context.Context) {
	for _, p := range s.retry {
		s.pay(ctx, p, p.Target.Minutes)
	}
}

func (s *Service) send(userID string, ev ProgressEvent) {
	s.pub.SendToUser(userID, marshalEvent("event:objective", ev))
}
```

> Em `Announce`, o `callID` vem do `Target.CallID` (preenchido por `personContributions`); no retry o `CallID` pode ser de uma call que já acabou: `BroadcastToCall` numa call inexistente é no-op, e o servidor e a pessoa ainda recebem o aviso.

`cmd/wire_event_objectives.go`:

```go
package main

import (
	"gin-quickstart/backend/internal/badge"
	"gin-quickstart/backend/internal/eventobjective"
)

// wireEventObjectives: o tempo dos objetivos dos eventos, contado olhando as
// calls (sem AFK) das salas dos eventos, só de contas reais (docs/adr/0037).
// Depende do level (aviso de nível) e do callAFK, criados antes.
func (a *app) wireEventObjectives() {
	service := eventobjective.NewService(
		eventobjective.NewRepository(a.db),
		a.callAFK,
		badge.NewRealAccountCache(badge.BadgeRepository(a.db)),
		a.hub,
		a.hub,
		a.levelService,
	)
	go service.Run(a.ctx)
}
```

`wire.go`: campo `levelService *level.Service` na struct `app`; chamada `a.wireEventObjectives()` logo depois de `a.wireServerLevel()`. `wire_engagement.go`: depois de criar `levelService`, `a.levelService = levelService`.

- [ ] **Step 4: Ver passar**

Run: `cd backend && "$GO" build ./... && "$GO" vet ./... && "$GO" test ./internal/eventobjective/ ./cmd/`
Expected: `ok`, incluindo o teste de boot de `cmd` (que sobe a fiação).

- [ ] **Step 5: Commit**

```bash
git add backend/internal/eventobjective backend/cmd
git commit -m "feat(eventos): o ticker dos objetivos, o aviso event:objective e a ligação"
```

---

### Task 7: Objetivos no app: tipos, lógica pura e formulário (dados)

**Files:**
- Create: `frontend/src/renderer/src/features/events/lib/objectives.ts`
- Modify: `frontend/src/renderer/src/features/events/api/events.ts`, `frontend/src/renderer/src/features/events/lib/eventForm.ts`
- Test: `frontend/src/renderer/src/features/events/lib/objectives.test.ts`, `eventForm.test.ts`, `api/events.test.ts`, e os fixtures com `ServerEvent` (`eventList.test.ts`, `eventsStore.test.ts`, `EventsPanelBody.test.tsx`, `EventForm.test.tsx`)

**Interfaces:**
- Produces:
  - em `api/events.ts`: `type ObjectiveKind = 'time' | 'game'`, `type ObjectiveDifficulty = 'easy' | 'medium' | 'hard'`, `interface EventObjective { id: string; kind: ObjectiveKind; difficulty: ObjectiveDifficulty; minutes: number; xp: number; my_minutes: number; my_done: boolean }`, `interface ObjectiveInput { kind: ObjectiveKind; difficulty: ObjectiveDifficulty; minutes: number }`; `ServerEvent.objectives: EventObjective[]`; `EventInput.objectives: ObjectiveInput[]`
  - em `lib/objectives.ts`: `MAX_OBJECTIVES = 3`, `OBJECTIVE_MINUTES = [15, 30, 45, 60, 90, 120]`, `DIFFICULTIES`, `KINDS`, `minutesOptions(durationMinutes: number): number[]`, `objectiveTitle(o: { kind: ObjectiveKind; minutes: number }, game: string | null): string`, `progressPercent(myMinutes: number, minutes: number): number`, `formatXp(xp: number): string`, `objectiveToast(title: string, xp: number, capped: boolean): string`, `emptyObjective(): ObjectiveInput`
  - em `lib/eventForm.ts`: `EventFormValues.objectives: ObjectiveInput[]`; `emptyForm` com `objectives: []`; `formFromEvent` copia `event.objectives` (kind, difficulty, minutes); `toInput` envia `objectives`; `objectivesError(v)` ('Escolha um jogo para o evento antes de usar o objetivo de jogo.' se há objetivo de jogo sem jogo; 'Escolha uma meta que caiba na duração do evento.' se a meta passa da duração).

- [ ] **Step 1: Testes que falham**

`objectives.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  OBJECTIVE_MINUTES,
  emptyObjective,
  formatXp,
  minutesOptions,
  objectiveTitle,
  objectiveToast,
  progressPercent
} from './objectives'

describe('objetivos do evento', () => {
  it('as metas são as da spec', () => {
    expect(OBJECTIVE_MINUTES).toEqual([15, 30, 45, 60, 90, 120])
  })

  it('só oferece metas que cabem na duração do evento', () => {
    expect(minutesOptions(30)).toEqual([15, 30])
    expect(minutesOptions(120)).toEqual([15, 30, 45, 60, 90, 120])
    expect(minutesOptions(10)).toEqual([])
  })

  it('gera o título do tipo, da meta e do jogo', () => {
    expect(objectiveTitle({ kind: 'time', minutes: 30 }, null)).toBe('Ficar 30 min na sala do evento')
    expect(objectiveTitle({ kind: 'game', minutes: 30 }, 'Minecraft')).toBe('Jogar Minecraft por 30 min')
    expect(objectiveTitle({ kind: 'game', minutes: 60 }, null)).toBe('Jogar o jogo do evento por 60 min')
  })

  it('calcula a porcentagem da barra, sem passar de 100', () => {
    expect(progressPercent(0, 30)).toBe(0)
    expect(progressPercent(12, 30)).toBe(40)
    expect(progressPercent(45, 30)).toBe(100)
    expect(progressPercent(5, 0)).toBe(0)
  })

  it('formata o XP com separador de milhar', () => {
    expect(formatXp(1000)).toBe('1.000')
    expect(formatXp(6000)).toBe('6.000')
  })

  it('monta o aviso de objetivo cumprido, com e sem o teto diário', () => {
    expect(objectiveToast('Ficar 30 min na sala do evento', 1000, false)).toBe(
      'Objetivo cumprido: Ficar 30 min na sala do evento. +1.000 XP'
    )
    expect(objectiveToast('Ficar 30 min na sala do evento', 400, true)).toBe(
      'Objetivo cumprido: Ficar 30 min na sala do evento. +400 XP (limite diário de XP de eventos)'
    )
  })

  it('o objetivo novo começa fácil, de tempo e de 15 min', () => {
    expect(emptyObjective()).toEqual({ kind: 'time', difficulty: 'easy', minutes: 15 })
  })
})
```

`eventForm.test.ts` (acrescente, no estilo dos casos do jogo): `emptyForm().objectives` é `[]`; `formFromEvent` com `objectives` copia só `kind/difficulty/minutes`; `toInput` envia a lista; `toInput` falha com a mensagem do objetivo de jogo sem jogo (`gameChoice: NO_GAME` + objetivo `game`) e com a meta maior que a duração.

Fixtures: acrescente `objectives: []` a todo `ServerEvent` de teste (`eventList.test.ts`, `eventsStore.test.ts`, `EventsPanelBody.test.tsx`, `EventForm.test.tsx`) e `objectives: []` ao `EventInput` de `api/events.test.ts`.

- [ ] **Step 2: Ver falhar**

Run: `cd frontend && npx vitest run src/renderer/src/features/events/lib`
Expected: FAIL (`Cannot find module './objectives'`; erros de tipo nos fixtures).

- [ ] **Step 3: Implementar**

`lib/objectives.ts`:

```ts
import type { ObjectiveDifficulty, ObjectiveInput, ObjectiveKind } from '../api/events'

// Objetivos do evento (spec 2026-10-31): lista de metas, rótulos e o texto gerado
// do título. O XP de cada objetivo vem do servidor (`xp`); aqui só se formata.

export const MAX_OBJECTIVES = 3
export const OBJECTIVE_MINUTES = [15, 30, 45, 60, 90, 120]

export const KINDS: { value: ObjectiveKind; label: string }[] = [
  { value: 'time', label: 'Ficar na sala' },
  { value: 'game', label: 'Jogar o jogo do evento' }
]

export const DIFFICULTIES: { value: ObjectiveDifficulty; label: string }[] = [
  { value: 'easy', label: 'Fácil' },
  { value: 'medium', label: 'Médio' },
  { value: 'hard', label: 'Difícil' }
]

/** As metas que cabem na duração do evento. */
export function minutesOptions(durationMinutes: number): number[] {
  return OBJECTIVE_MINUTES.filter((m) => m <= durationMinutes)
}

export function emptyObjective(): ObjectiveInput {
  return { kind: 'time', difficulty: 'easy', minutes: 15 }
}

/** O título do objetivo, gerado do tipo, da meta e do jogo do evento. */
export function objectiveTitle(o: { kind: ObjectiveKind; minutes: number }, game: string | null): string {
  if (o.kind === 'time') return `Ficar ${o.minutes} min na sala do evento`
  return `Jogar ${game ?? 'o jogo do evento'} por ${o.minutes} min`
}

/** Quanto da barra está cheio (0 a 100). */
export function progressPercent(myMinutes: number, minutes: number): number {
  if (minutes <= 0) return 0
  return Math.min(100, Math.round((myMinutes / minutes) * 100))
}

export function formatXp(xp: number): string {
  return xp.toLocaleString('pt-BR')
}

/** O aviso ao cumprir; com o teto diário, diz que parte do XP ficou de fora. */
export function objectiveToast(title: string, xp: number, capped: boolean): string {
  const base = `Objetivo cumprido: ${title}. +${formatXp(xp)} XP`
  return capped ? `${base} (limite diário de XP de eventos)` : base
}
```

> `toLocaleString('pt-BR')` precisa dos dados de locale do Node: o Node tem ICU completo desde a 13, então `1000 → '1.000'`. Se o teste do CI do Windows devolver `1000`, troque por um formatador manual (`String(xp).replace(/\B(?=(\d{3})+(?!\d))/g, '.')`).

`api/events.ts`: acrescente os tipos (`ObjectiveKind`, `ObjectiveDifficulty`, `EventObjective`, `ObjectiveInput`), `objectives: EventObjective[]` em `ServerEvent` e `objectives: ObjectiveInput[]` em `EventInput`.

`lib/eventForm.ts`: acrescente `objectives: ObjectiveInput[]` em `EventFormValues`, `objectives: []` no `emptyForm`, em `formFromEvent`:

```ts
    objectives: event.objectives.map((o) => ({ kind: o.kind, difficulty: o.difficulty, minutes: o.minutes })),
```

a validação (função própria para o CRAP de `toInput` não subir):

```ts
/** Objetivo de jogo sem jogo no evento, ou com meta maior que a duração. */
function objectivesError(v: EventFormValues): string | null {
  if (v.objectives.some((o) => o.kind === 'game') && v.gameChoice === NO_GAME) {
    return 'Escolha um jogo para o evento antes de usar o objetivo de jogo.'
  }
  if (v.objectives.some((o) => o.minutes > v.durationMinutes)) {
    return 'Escolha uma meta que caiba na duração do evento.'
  }
  return null
}
```

em `toInput`: `const text = textError(v) ?? gameError(v) ?? objectivesError(v)` e `objectives: v.objectives` no `input`.

- [ ] **Step 4: Ver passar**

Run: `cd frontend && npx vitest run src/renderer/src/features/events && npx tsc --noEmit -p tsconfig.web.json --composite false`
Expected: tudo verde e sem erro de tipo. Confira o CRAP: `node scripts/crap.mjs --files frontend/src/renderer/src/features/events/lib/eventForm.ts frontend/src/renderer/src/features/events/lib/objectives.ts`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/renderer/src/features/events
git commit -m "feat(eventos): tipos e lógica dos objetivos no app"
```

---

### Task 8: Objetivos no app: formulário, detalhe e avisos

**Files:**
- Create: `frontend/src/renderer/src/features/events/components/ObjectivesField.tsx`, `ObjectiveRow.tsx`, `ObjectivesList.tsx`, `ObjectiveBar.tsx`
- Modify: `components/EventForm.tsx` (renderiza `ObjectivesField`), `components/EventDetail.tsx` (renderiza `ObjectivesList`), `lib/eventList.ts` (`applyObjectiveProgress`), `store/eventsStore.ts` (`event:objective`), `frontend/src/renderer/src/features/serverlevel/lib/serverLevel.ts` (rótulo `evento`)
- Test: `ObjectivesField.test.tsx`, `ObjectiveRow.test.tsx`, `ObjectivesList.test.tsx`, `EventForm.test.tsx`, `EventsPanelBody.test.tsx`, `lib/eventList.test.ts`, `store/eventsStore.test.ts`, `serverlevel/lib/serverLevel.test.ts`

**Interfaces:**
- Consumes: Task 7.
- Produces:
  - `ObjectivesField({ objectives, durationMinutes, hasGame, disabled?, onChange })`: `onChange(next: ObjectiveInput[])`
  - `ObjectivesList({ objectives, game, going })`: `going: boolean` (se a pessoa disse Vou)
  - `applyObjectiveProgress(list: ServerEvent[], eventId: string, objectiveId: string, minutes: number, done: boolean): ServerEvent[]` em `eventList.ts`
  - o handler `event:objective` do `eventsStore` aplica o progresso e, ao cumprir (`done`), chama `showToast.success(objectiveToast(...), 6000)`.

- [ ] **Step 1: Testes que falham**

`ObjectiveRow.test.tsx` (SSR, como `GameField.test.tsx`): a linha mostra os três selects (`Tipo`, `Dificuldade`, `Meta`) com os rótulos aprovados; o tipo "Jogar o jogo do evento" vem `disabled` e a dica "Escolha um jogo para o evento." aparece quando `hasGame={false}`; com `hasGame` aparece a dica "Conta só para quem usa o app para Windows." quando o tipo é `game`; as metas só vão até a duração; o botão de remover tem o nome acessível "Remover objetivo"; `disabled` desativa os campos.

`ObjectivesField.test.tsx`: o título "Objetivos (opcional)" e a ajuda "Quem confirmar presença e cumprir o objetivo na sala do evento ganha XP."; sem objetivos só há o botão "Adicionar objetivo"; com 3 objetivos o botão some; `disabled` (evento em andamento) esconde o botão e trava as linhas.

`ObjectivesList.test.tsx`: título gerado ("Ficar 30 min na sala do evento", "Jogar Minecraft por 30 min"), "+1.000 XP", "12 de 30 min", a barra (`role="progressbar"` com `aria-valuenow`), "Cumprido" quando `my_done`; sem objetivos não renderiza nada; com `going={false}` aparece "Confirme presença para ganhar XP com os objetivos.".

`EventsPanelBody.test.tsx`: o detalhe de um evento com objetivos mostra o título "Objetivos" e o objetivo; sem objetivos não aparece "Objetivos".

`eventList.test.ts`: `applyObjectiveProgress` troca `my_minutes` e `my_done` só do objetivo certo, sem mexer nos outros eventos; id desconhecido devolve a mesma lista.

`eventsStore.test.ts`: depois de `load`, `handleWsEvent({ type: 'event:objective', payload: { server_id, event_id, objective_id, minutes: 7, done: false, xp: 0, capped: false } })` devolve `true` e o progresso aparece; com `done: true` e `xp: 1000` o toast é chamado com "Objetivo cumprido: Ficar 30 min na sala do evento. +1.000 XP" (mock de `showToast`, como o `EventsPanelBody.test` mocka stores pesados).

`serverLevel.test.ts`: o rótulo da fonte `evento` é "Objetivos de eventos".

- [ ] **Step 2: Ver falhar**

Run: `cd frontend && npx vitest run src/renderer/src/features/events src/renderer/src/features/serverlevel`
Expected: FAIL (componentes e `applyObjectiveProgress` ainda não existem).

- [ ] **Step 3: Implementar**

`components/ObjectiveRow.tsx` (modelo: `GameField.tsx`; selects com `glass-input`, opções com `className="bg-floating"`, remover com `IconButton` + ícone de `shared/ui/icons`: use `TrashIcon`, que o `EventDetail` já importa, com o `aria-label` "Remover objetivo"):

```tsx
import IconButton from '../../../shared/ui/IconButton'
import { TrashIcon } from '../../../shared/ui/icons'
import type { ObjectiveInput } from '../api/events'
import { DIFFICULTIES, KINDS, minutesOptions } from '../lib/objectives'

const LABEL = 'flex min-w-0 flex-col gap-1.5 text-ds-sm font-medium text-secondary'

/** Uma linha do formulário: tipo, dificuldade e meta de um objetivo. Coluna no celular, três campos de 768 px em diante. */
export default function ObjectiveRow({
  index,
  objective,
  durationMinutes,
  hasGame,
  disabled = false,
  onChange,
  onRemove
}: {
  index: number
  objective: ObjectiveInput
  durationMinutes: number
  hasGame: boolean
  disabled?: boolean
  onChange: (next: ObjectiveInput) => void
  onRemove: () => void
}): React.JSX.Element {
  const metas = minutesOptions(durationMinutes)
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-subtle bg-fg/5 p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <label className={`${LABEL} md:flex-1`}>
          Tipo
          <select
            name={`objective-kind-${index}`}
            disabled={disabled}
            className="glass-input"
            value={objective.kind}
            onChange={(e) => onChange({ ...objective, kind: e.target.value as ObjectiveInput['kind'] })}
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value} disabled={k.value === 'game' && !hasGame} className="bg-floating">
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className={`${LABEL} md:flex-1`}>
          Dificuldade
          <select
            name={`objective-difficulty-${index}`}
            disabled={disabled}
            className="glass-input"
            value={objective.difficulty}
            onChange={(e) =>
              onChange({ ...objective, difficulty: e.target.value as ObjectiveInput['difficulty'] })
            }
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value} className="bg-floating">
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className={`${LABEL} md:w-32`}>
          Meta
          <select
            name={`objective-minutes-${index}`}
            disabled={disabled}
            className="glass-input"
            value={objective.minutes}
            onChange={(e) => onChange({ ...objective, minutes: Number(e.target.value) })}
          >
            {metas.map((m) => (
              <option key={m} value={m} className="bg-floating">
                {`${m} min`}
              </option>
            ))}
          </select>
        </label>
        {!disabled && (
          <IconButton icon={TrashIcon} label="Remover objetivo" onClick={onRemove} />
        )}
      </div>
      {!hasGame && <p className="text-ds-xs text-muted">Escolha um jogo para o evento.</p>}
      {objective.kind === 'game' && (
        <p className="text-ds-xs text-muted">Conta só para quem usa o app para Windows.</p>
      )}
    </div>
  )
}
```

> Confira a assinatura real de `IconButton` em `shared/ui/IconButton.tsx` (nome das props `icon`/`label`) e ajuste; a dica "Escolha um jogo para o evento." só aparece quando o tipo "Jogar o jogo do evento" está desativado (isto é, `!hasGame`).

`components/ObjectivesField.tsx`:

```tsx
import Button from '../../../shared/ui/Button'
import { PlusIcon } from '../../../shared/ui/icons'
import type { ObjectiveInput } from '../api/events'
import { MAX_OBJECTIVES, emptyObjective } from '../lib/objectives'
import ObjectiveRow from './ObjectiveRow'

/** Os objetivos do evento (opcional, até 3): quem confirma presença e cumpre na sala ganha XP. */
export default function ObjectivesField({
  objectives,
  durationMinutes,
  hasGame,
  disabled = false,
  onChange
}: {
  objectives: ObjectiveInput[]
  durationMinutes: number
  hasGame: boolean
  disabled?: boolean
  onChange: (next: ObjectiveInput[]) => void
}): React.JSX.Element {
  const replace = (index: number, next: ObjectiveInput): void =>
    onChange(objectives.map((o, i) => (i === index ? next : o)))
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="text-ds-sm font-medium text-secondary">Objetivos (opcional)</legend>
      <p className="text-ds-xs text-muted">
        Quem confirmar presença e cumprir o objetivo na sala do evento ganha XP.
      </p>
      {objectives.map((o, i) => (
        <ObjectiveRow
          key={i}
          index={i}
          objective={o}
          durationMinutes={durationMinutes}
          hasGame={hasGame}
          disabled={disabled}
          onChange={(next) => replace(i, next)}
          onRemove={() => onChange(objectives.filter((_, j) => j !== i))}
        />
      ))}
      {!disabled && objectives.length < MAX_OBJECTIVES && (
        <Button
          type="button"
          variant="ghost"
          icon={PlusIcon}
          className="self-start"
          onClick={() => onChange([...objectives, emptyObjective()])}
        >
          Adicionar objetivo
        </Button>
      )}
    </fieldset>
  )
}
```

`EventForm.tsx`: depois do `GameField`, antes do `RecurrenceFields`:

```tsx
        <ObjectivesField
          objectives={values.objectives}
          durationMinutes={values.durationMinutes}
          hasGame={values.gameChoice !== NO_GAME}
          disabled={running}
          onChange={(objectives) => patch({ objectives })}
        />
```

(importe `ObjectivesField` e `NO_GAME`). Se `EventForm.tsx` passar de 150 linhas, tudo bem (limite do repo é 400), mas mantenha o componente simples.

`components/ObjectiveBar.tsx` (barra acessível):

```tsx
import { progressPercent } from '../lib/objectives'

/** A barra de progresso de um objetivo (ocupa a largura toda). */
export default function ObjectiveBar({ minutes, goal, label }: { minutes: number; goal: number; label: string }): React.JSX.Element {
  const percent = progressPercent(minutes, goal)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2 w-full overflow-hidden rounded-full bg-fg/10"
    >
      <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
    </div>
  )
}
```

`components/ObjectivesList.tsx`:

```tsx
import { CheckIcon } from '../../../shared/ui/icons'
import type { EventObjective } from '../api/events'
import { formatXp, objectiveTitle } from '../lib/objectives'
import ObjectiveBar from './ObjectiveBar'

/** Os objetivos do evento no detalhe, com o meu progresso na ocorrência atual. */
export default function ObjectivesList({
  objectives,
  game,
  going
}: {
  objectives: EventObjective[]
  game: string | null
  going: boolean
}): React.JSX.Element | null {
  if (objectives.length === 0) return null
  return (
    <section aria-label="Objetivos" className="flex min-w-0 flex-col gap-3">
      <h4 className="text-ds-md font-semibold text-strong">Objetivos</h4>
      {!going && (
        <p className="text-ds-xs text-muted">Confirme presença para ganhar XP com os objetivos.</p>
      )}
      <ul className="flex flex-col gap-3">
        {objectives.map((o) => {
          const title = objectiveTitle(o, game)
          return (
            <li key={o.id} className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-subtle bg-fg/5 p-3">
              <p className="min-w-0 break-words text-ds-sm text-normal">{title}</p>
              <p className="text-ds-xs text-secondary">{`+${formatXp(o.xp)} XP`}</p>
              <ObjectiveBar minutes={o.my_minutes} goal={o.minutes} label={title} />
              {o.my_done ? (
                <p className="flex items-center gap-1 text-ds-xs text-success">
                  <CheckIcon size={14} />
                  Cumprido
                </p>
              ) : (
                <p className="text-ds-xs text-muted">{`${o.my_minutes} de ${o.minutes} min`}</p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
```

`EventDetail.tsx`: depois do `<GoingList .../>` (ou entre a descrição e o `RsvpButtons`, onde ficar melhor no visual): `<ObjectivesList objectives={event.objectives} game={event.game_name} going={event.my_rsvp === true} />`.

`lib/eventList.ts`:

```ts
/** Aplica o meu progresso num objetivo (aviso event:objective). */
export function applyObjectiveProgress(
  list: ServerEvent[],
  eventId: string,
  objectiveId: string,
  minutes: number,
  done: boolean
): ServerEvent[] {
  return mapEvent(list, eventId, (e) => ({
    ...e,
    objectives: e.objectives.map((o) =>
      o.id === objectiveId ? { ...o, my_minutes: minutes, my_done: done || o.my_done } : o
    )
  }))
}
```

`store/eventsStore.ts`: acrescente `objective_id?: string; minutes?: number; done?: boolean; xp?: number; capped?: boolean` em `WsPayload` e o handler:

```ts
    'event:objective': (p) => {
      if (!loaded(p.server_id) || !p.event_id || !p.objective_id || typeof p.minutes !== 'number') return
      const done = p.done === true
      const list = get().byServer[p.server_id] ?? []
      const objective = list.find((e) => e.id === p.event_id)?.objectives.find((o) => o.id === p.objective_id)
      edit(p.server_id, (l) => applyObjectiveProgress(l, p.event_id!, p.objective_id!, p.minutes!, done))
      if (done && objective) {
        const event = list.find((e) => e.id === p.event_id)!
        showToast.success(objectiveToast(objectiveTitle(objective, event.game_name), p.xp ?? 0, p.capped === true), 6000)
      }
    }
```

(importe `showToast`, `objectiveTitle`, `objectiveToast`, `applyObjectiveProgress`. Se a complexidade do handler passar de 6, extraia o aviso para `lib/objectiveEvents.ts`.)

`serverlevel/lib/serverLevel.ts`: acrescente `evento: 'Objetivos de eventos'` ao mapa de rótulos (ao lado de `presenca: 'Call cheia'`), e o texto da lista em `ServerLevelDetails.tsx` ("O nível sobe só com quem usa o servidor: …") ganha "objetivos de eventos" se o texto listar as fontes (ajuste só se a frase enumerar todas).

- [ ] **Step 4: Ver passar**

Run: `cd frontend && npx vitest run src/renderer/src/features/events src/renderer/src/features/serverlevel src/renderer/src/features/servers && npx tsc --noEmit -p tsconfig.web.json --composite false && cd .. && node scripts/check-design.mjs && node scripts/check-structure.mjs`
Expected: verde. Confirme o CRAP dos arquivos tocados.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/renderer/src/features/events frontend/src/renderer/src/features/serverlevel
git commit -m "feat(eventos): objetivos no formulário e no detalhe, e o aviso ao cumprir"
```

---

### Task 9: Docs, changelog e verificação

**Files:**
- Modify: `docs/EVENTOS.md`, `docs/superpowers/specs/2026-10-31-eventos-objetivos-xp-design.md` (a linha de `lib/objectives.ts`: o XP vem do servidor), `docs/adr/0037-objetivos-do-evento-pagos-em-transacao-unica.md` (status "aceito")
- Create: `changelog/pending/2026-10-31-eventos-objetivos.md`

- [ ] **Step 1: `docs/EVENTOS.md`**
  - Nova regra **Objetivos**: até 3 por evento; tipos `time` e `game`; metas; dificuldade e XP (tabela); quem pontua (Vou, conta real, na sala, minuto elegível do XP de voz, jogo detectado no tipo `game`); acumula; ocorrência zera; travados com o evento em andamento; tetos (6.000 pessoal/dia, 300 do servidor/dia); pagamento numa transação; avisos.
  - Seção **Como o XP é pago** (ticker de 10 s, `eventobjective/`, ADR 0037).
  - API: `objectives` no JSON do evento (`kind`, `difficulty`, `minutes`, `xp`, `my_minutes`, `my_done`) e no corpo de criar/editar; erro `invalid_objective`; evento `event:objective` (payload).
  - Tirar "Objetivos e XP na call (fase 3)" de "Fora de escopo".
- [ ] **Step 2: Changelog** `changelog/pending/2026-10-31-eventos-objetivos.md` (sem pedir aprovação, regra do AGENTS.md):

```md
## Novidades

- Eventos: agora dá para cadastrar até 3 objetivos no evento, com dificuldade. Quem confirmar presença e cumprir o objetivo na sala do evento ganha XP, e o servidor também ganha um pouco.
```

  Rode `node scripts/publish-changelog.mjs --check changelog/pending`.
- [ ] **Step 3: Spec e ADR**: ajuste na spec a linha do `lib/objectives.ts` ("tabela de XP e rótulos" → "rótulos, metas, título gerado e barra; o XP vem do servidor") e mude o status do ADR para `aceito`.
- [ ] **Step 4: Verificação visual** (harness temporário `frontend/.harness`, apagado depois; o mesmo da Fase 2: `vite.config.ts` com `rendererShared()` e `root` na pasta `frontend`, acessando `/.harness/index.html`): formulário com 0, 1 e 3 objetivos, com e sem jogo, e o detalhe com objetivos em andamento, cumprido e sem Vou, em 360, 768 e 1280 px. Sem rolagem horizontal; alvos de toque ≥ 40 px; leia as capturas (não confie só no teste de overflow).
- [ ] **Step 5: Pipeline**: `export TEST_DATABASE_URL=…` e `node scripts/affected-tests.mjs pr`; guarde a saída; `node scripts/crap.mjs` (depois). Nenhuma função **tocada** acima de 15.
- [ ] **Step 6: Prova de ponta a ponta** com duas contas reais e o `livekit-server.exe` nativo, como a spec descreve (se o ambiente não permitir a mídia local, diga isso no PR: o ciclo completo com banco de verdade está em `service_db_test.go`).
- [ ] **Step 7: Commit** `docs(eventos): guia, changelog e ADR da fase 3`.

---

## Auto-revisão

**Cobertura da spec:** valores, tetos e tipos (T1, T5); tabelas e leitura (T2); objetivos no evento, validação e `event_running` ao mudar com o evento rodando (T3); `ChannelID`, `GameName`, quem pontua e tracker (T4); pagamento atômico, XP pessoal e do servidor, teto 6.000 e 300, "objetivo conta mesmo com o teto cheio" (T5); ticker, `event:objective`, retry de pagamento e ligação (T6); formulário, detalhe, barra, "Cumprido", mensagem sem Vou, aviso ao cumprir e rótulo da fonte (T7, T8); docs, changelog, responsivo e ponta a ponta (T9). Fora de escopo respeitado (sem marcação manual, texto livre, ranking, DM do bot, retroativo, Android).

**Placeholders:** os pontos que dependem de helper de teste existente (`runningFixture`, `inputOf`, `validDBInput`, `fakePublisher`) estão marcados com "use o nome real do arquivo"; todo o código de produção está escrito.

**Consistência de tipos:** `Target`, `Room`, `RoomObjective`, `Contribution`, `Drained`, `Payment`, `Receipt` e `ProgressEvent` são definidos uma vez (T4–T6) e reaproveitados com os mesmos campos; `EventObjective`/`ObjectiveInput` do app espelham `Objective`/`Input` do backend (`kind`, `difficulty`, `minutes`, `xp`, `my_minutes`, `my_done`); o tipo de evento `event:objective` e o payload têm o mesmo nome no backend (T6) e na store (T8).
