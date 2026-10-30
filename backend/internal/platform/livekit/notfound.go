package livekit

import (
	"errors"

	"github.com/twitchtv/twirp"
)

// IsNotFound: a API de administração respondeu que a sala ou o participante
// não existe (ex.: remover quem já saiu).
func IsNotFound(err error) bool {
	var twerr twirp.Error
	return errors.As(err, &twerr) && twerr.Code() == twirp.NotFound
}
