import Button from '../../../shared/ui/Button'

/** Rodapé do editor de permissões do canal: remover as regras do alvo ou salvar. */
function OverwriteEditorFooter({
  busy,
  canRemove,
  canSave,
  onRemove,
  onSave
}: {
  busy: boolean
  canRemove: boolean
  canSave: boolean
  onRemove: () => void
  onSave: () => void
}): React.JSX.Element {
  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      <Button
        variant="ghost"
        className="px-3 py-1.5 text-xs"
        disabled={busy || !canRemove}
        onClick={onRemove}
      >
        Remover regras
      </Button>
      <Button variant="success" disabled={busy || !canSave} onClick={onSave}>
        {busy ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  )
}

export default OverwriteEditorFooter
