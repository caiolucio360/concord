/** Mesa sem nada para mostrar: servidor sem sons ou busca sem resultado. */
export default function SoundboardEmpty({
  searching,
  canAdd
}: {
  /** Há sons, mas a busca não achou nenhum. */
  searching: boolean
  canAdd: boolean
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-dashed border-subtle py-8 text-center">
      <p className="text-xs font-medium text-secondary">
        {searching ? 'Nenhum som encontrado para essa busca.' : 'Nenhum som neste servidor ainda.'}
      </p>
      {!searching && canAdd && (
        <p className="mt-1 text-ds-xs text-faint">
          Clique em &ldquo;Adicionar som&rdquo; para enviar um áudio de até 15s (5 MB).
        </p>
      )}
    </div>
  )
}
