package livekit

import (
	"errors"
	"fmt"
	"testing"

	"github.com/twitchtv/twirp"
)

func TestIsNotFound(t *testing.T) {
	if !IsNotFound(fmt.Errorf("remove: %w", twirp.NotFoundError("participant not found"))) {
		t.Fatal("twirp NotFound é 'não está na sala'")
	}
	if IsNotFound(twirp.InternalError("boom")) || IsNotFound(errors.New("rede")) || IsNotFound(nil) {
		t.Fatal("outros erros não são 'não encontrado'")
	}
}
