package message

import (
	"strings"
	"testing"
)

func TestValidateEmoji(t *testing.T) {
	valid := []string{"👍", "❤️", "😂", "🔥", "🎉", "👀", "👨‍💻"}
	for _, emoji := range valid {
		if err := ValidateEmoji(emoji); err != nil {
			t.Errorf("expected emoji %q to be valid, got error: %v", emoji, err)
		}
	}

	invalid := []string{
		"",
		"   ",
		" 👍",
		"👍 ",
		"👍 ❤️",
		"👍\n",
		strings.Repeat("a", 33),
	}
	for _, emoji := range invalid {
		if err := ValidateEmoji(emoji); err == nil {
			t.Errorf("expected emoji %q to be invalid", emoji)
		}
	}
}

func TestValidateEmojiPersonalizado(t *testing.T) {
	id := "3f2b6c1e-8a4d-4f7e-9b1a-2c3d4e5f6a7b"
	if err := ValidateEmoji("<:" + id + ">"); err != nil {
		t.Fatalf("reação <:id> deveria valer, veio %v", err)
	}
	for _, emoji := range []string{"<:" + strings.ToUpper(id) + ">", "<:nao-e-uuid>", "<:" + id, "<:>", "<:" + id + ">x"} {
		if err := ValidateEmoji(emoji); err == nil {
			t.Errorf("esperava %q inválido", emoji)
		}
	}
}
