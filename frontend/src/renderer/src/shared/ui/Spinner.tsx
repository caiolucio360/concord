/** Rodinha de carregamento na cor do texto (o `Button` com `loading` usa). */
function Spinner({ className = 'size-4' }: { className?: string }): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  )
}

export default Spinner
