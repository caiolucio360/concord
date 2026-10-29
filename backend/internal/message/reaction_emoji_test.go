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
