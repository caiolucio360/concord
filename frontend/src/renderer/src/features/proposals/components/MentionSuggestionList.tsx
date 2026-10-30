interface Suggestion {
  username: string
  display_name: string
}

/** Lista do "@" acima do campo de comentário. */
function MentionSuggestionList({
  suggestions,
  highlight,
  onPick,
  onHighlight
}: {
  suggestions: Suggestion[]
  highlight: number
  onPick: (username: string) => void
  onHighlight: (index: number) => void
}): React.JSX.Element | null {
  if (suggestions.length === 0) return null
  return (
    <ul
      role="listbox"
      aria-label="Marcar alguém"
      className="absolute bottom-full left-0 right-0 z-10 mb-1 overflow-hidden rounded-lg border border-subtle bg-floating py-1 shadow-2xl"
    >
      {suggestions.map((m, i) => (
        <li
          key={m.username}
          role="option"
          aria-selected={i === highlight}
          onMouseDown={(e) => {
            e.preventDefault()
            onPick(m.username)
          }}
          onMouseEnter={() => onHighlight(i)}
          className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${
            i === highlight ? 'bg-brand/30 text-strong' : 'text-secondary'
          }`}
        >
          <span className="font-semibold">{m.display_name}</span>
          <span className="text-xs text-muted">@{m.username}</span>
        </li>
      ))}
    </ul>
  )
}

export default MentionSuggestionList
