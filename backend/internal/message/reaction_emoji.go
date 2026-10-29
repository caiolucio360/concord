package message

import (
	"errors"
	"unicode"
	"unicode/utf8"
)

var ErrInvalidEmoji = errors.New("invalid emoji reaction")

// ValidateEmoji confere o emoji de uma reação: um emoji curto, sem espaço nem
// caractere de controle.
func ValidateEmoji(emoji string) error {
	if emoji == "" || len(emoji) > 32 || !utf8.ValidString(emoji) {
		return ErrInvalidEmoji
	}
	for _, r := range emoji {
		if unicode.IsSpace(r) || unicode.IsControl(r) {
			return ErrInvalidEmoji
		}
	}
	return nil
}
