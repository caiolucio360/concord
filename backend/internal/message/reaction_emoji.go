package message

import (
	"errors"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/google/uuid"
)

var ErrInvalidEmoji = errors.New("invalid emoji reaction")

// ValidateEmoji confere o emoji de uma reação: um emoji personalizado no
// formato "<:id>" (docs/adr/0028-emojis-personalizados.md) ou um emoji curto,
// sem espaço nem caractere de controle. Começar com "<:" é sempre o formato
// personalizado, para "<:qualquer-coisa>" não passar como emoji comum.
func ValidateEmoji(emoji string) error {
	if strings.HasPrefix(emoji, "<:") {
		return validateCustomEmoji(emoji)
	}
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

// validateCustomEmoji: "<:" + UUID canônico (36 caracteres) + ">".
func validateCustomEmoji(emoji string) error {
	id, ok := strings.CutSuffix(emoji[2:], ">")
	if !ok || len(id) != 36 || uuid.Validate(id) != nil {
		return ErrInvalidEmoji
	}
	return nil
}
