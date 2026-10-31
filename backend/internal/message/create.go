package message

import (
	"context"
	"strings"

	"github.com/google/uuid"
)

// Criar uma mensagem (de canal ou de conversa): validar, gravar e reler para publicar.

func (s *Service) create(ctx context.Context, channelID string, conversationID string, authorID string, content string, replyToID *string, attachmentIDs []string, mentionEveryone *string, stickerID *string, gifURL *string, gifMetadata *GifMetadata) (*Message, error) {
	hasMedia := len(attachmentIDs) > 0 || stickerID != nil || gifURL != nil
	if err := validateNewMessageWithMedia(content, attachmentIDs, hasMedia); err != nil {
		return nil, err
	}
	normalizedReplyID, err := s.replyTarget(ctx, replyToID, channelID, conversationID)
	if err != nil {
		return nil, err
	}

	msg := &Message{
		ID:              uuid.New().String(),
		AuthorID:        authorID,
		ChannelID:       nilIfEmpty(channelID),
		ConversationID:  nilIfEmpty(conversationID),
		ReplyToID:       normalizedReplyID,
		Content:         content,
		MentionEveryone: mentionEveryone,
		StickerID:       stickerID,
		GifURL:          gifURL,
		GifMetadata:     gifMetadata,
	}
	if len(attachmentIDs) == 0 {
		err = s.repository.Create(ctx, msg)
	} else {
		err = s.repository.CreateWithAttachments(ctx, msg, attachmentIDs)
	}
	if err != nil {
		return nil, err
	}
	return s.reloadNew(ctx, msg.ID, len(attachmentIDs) > 0)
}

// replyTarget confere que a mensagem respondida é da mesma sala e devolve o
// id sem espaços (nil = não é resposta).
func (s *Service) replyTarget(ctx context.Context, replyToID *string, channelID, conversationID string) (*string, error) {
	if replyToID == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*replyToID)
	if trimmed == "" {
		return nil, nil
	}
	target, err := s.repository.FindByID(ctx, trimmed)
	if err != nil || !SameRoomTarget(target, channelID, conversationID) {
		return nil, ErrInvalidReply
	}
	return &trimmed, nil
}

// reloadNew relê a mensagem recém-gravada para publicar. Ela ainda não tem
// reações, e só tem anexos se foram enviados: sem eles, nada a buscar.
func (s *Service) reloadNew(ctx context.Context, id string, withAttachments bool) (*Message, error) {
	full, err := s.repository.FindNewByID(ctx, id)
	if err != nil {
		return nil, err
	}
	page := []Message{*full}
	if withAttachments {
		// O message:create publicado já leva os anexos.
		if err := s.repository.AttachAttachments(ctx, page); err != nil {
			return nil, err
		}
	}
	return &page[0], nil
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
