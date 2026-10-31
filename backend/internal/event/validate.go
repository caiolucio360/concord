package event

import (
	"slices"
	"strings"
	"time"
	"unicode/utf8"
)

// normalize confere o pedido e devolve a versão limpa (título sem espaços nas
// pontas, antecedências do maior para o menor e sem repetição).
func (in Input) normalize(now time.Time) (Input, error) {
	in.Title = strings.TrimSpace(in.Title)
	in.Description = strings.TrimSpace(in.Description)
	if n := utf8.RuneCountInString(in.Title); n < 1 || n > MaxTitleRunes {
		return in, ErrInvalidTitle
	}
	if utf8.RuneCountInString(in.Description) > MaxDescriptionRunes {
		return in, ErrInvalidDescription
	}
	if !in.StartsAt.After(now) {
		return in, ErrInPast
	}
	if err := in.checkRecurrence(); err != nil {
		return in, err
	}
	offsets, err := cleanOffsets(in.ReminderOffsets)
	in.ReminderOffsets = offsets
	return in, err
}

func (in Input) checkRecurrence() error {
	if !in.Recurrence.Valid() {
		return ErrInvalidRecurrence
	}
	if in.Recurrence == RecNone && (in.RecurrenceUntil != nil || in.RecurrenceCount != nil) {
		return ErrInvalidRecurrence
	}
	if in.RecurrenceCount != nil && *in.RecurrenceCount < 1 {
		return ErrInvalidRecurrence
	}
	if in.RecurrenceUntil != nil && !in.RecurrenceUntil.After(in.StartsAt) {
		return ErrInvalidRecurrence
	}
	return nil
}

func cleanOffsets(raw []int) ([]int, error) {
	if raw == nil {
		return slices.Clone(DefaultOffsets), nil
	}
	seen := make(map[int]bool, len(raw))
	for _, m := range raw {
		if !slices.Contains(AllowedOffsets, m) {
			return nil, ErrInvalidReminder
		}
		seen[m] = true
	}
	if len(seen) > MaxOffsets {
		return nil, ErrTooManyReminders
	}
	out := make([]int, 0, len(seen))
	for m := range seen {
		out = append(out, m)
	}
	slices.SortFunc(out, func(a, b int) int { return b - a })
	return out, nil
}
