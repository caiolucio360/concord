package music

// Texto do /fila. Extraído do manager.go.

import "time"

func (m *Manager) queueText(p *Player) (string, bool) {
	s := p.Snapshot()
	if s.Now == nil {
		return "", false
	}
	elapsed := time.Since(s.StartedAt).Milliseconds()
	remaining := s.Now.Track.DurationMs - elapsed
	if remaining < 0 {
		remaining = 0
	}
	var lines []QueueLine
	var moreMs int64
	for i, it := range s.Queue {
		if i < queueListMax {
			lines = append(lines, QueueLine{
				Title: it.Track.Title, DurationMs: it.Track.DurationMs, User: it.RequestedBy.Username,
				StartsInMs: StartsIn(remaining, s.Queue, i+1, crossfade.Milliseconds()),
			})
		} else {
			moreMs += it.Track.DurationMs
		}
	}
	more := len(s.Queue) - len(lines)
	return TextQueue(p.ChannelName, s.Now.Track.Title, elapsed, s.Now.Track.DurationMs, s.Now.RequestedBy.Username, lines, more, moreMs), true
}
