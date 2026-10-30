import type { OverwriteRow, OverwriteTargetRef } from '../lib/channelPermissions'
import type { MemberCandidate } from '../lib/overwriteEditor'
import { roleColorCss } from '../lib/permissions'
import Input from '../../../shared/ui/Input'

const sameRef = (a: OverwriteTargetRef | null, b: OverwriteTargetRef): boolean =>
  a?.type === b.type && a.id === b.id

/** Coluna da esquerda do editor: busca de membro para adicionar e os alvos com regra. */
function OverwriteTargetList({
  adding,
  onAddingChange,
  candidates,
  rows,
  current,
  onSelect,
  onAdd
}: {
  adding: string
  onAddingChange: (value: string) => void
  candidates: MemberCandidate[]
  rows: OverwriteRow[]
  current: OverwriteTargetRef | null
  onSelect: (ref: OverwriteTargetRef) => void
  onAdd: (ref: OverwriteTargetRef) => void
}): React.JSX.Element {
  return (
    <div className="w-52 shrink-0">
      <Input
        placeholder="Adicionar membro"
        aria-label="Adicionar membro"
        value={adding}
        onChange={(e) => onAddingChange(e.target.value)}
        className="mb-2 text-xs"
      />
      {adding.trim() && (
        <ul className="mb-2 max-h-40 overflow-y-auto rounded-lg border border-subtle bg-input p-1">
          {candidates.length === 0 && (
            <li className="px-2 py-1.5 text-xs text-gray-500">Ninguém encontrado.</li>
          )}
          {candidates.map((c) => (
            <li key={`${c.ref.type}:${c.ref.id}`}>
              <button
                type="button"
                onClick={() => onAdd(c.ref)}
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-gray-200 hover:bg-fg/10"
              >
                <span className="text-gray-500">@</span>
                <span className="truncate">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <ul className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
        {rows.map((row) => (
          <li key={`${row.type}:${row.id}`}>
            <TargetButton row={row} active={sameRef(current, row)} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function TargetButton({
  row,
  active,
  onSelect
}: {
  row: OverwriteRow
  active: boolean
  onSelect: (ref: OverwriteTargetRef) => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onSelect({ type: row.type, id: row.id })}
      aria-current={active ? 'true' : undefined}
      className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium ${
        active ? 'bg-fg/10 text-strong' : 'text-gray-400 hover:bg-fg/5'
      }`}
    >
      <span
        aria-hidden
        className="shrink-0 text-xs"
        style={{ color: roleColorCss(row.color) ?? 'var(--text-muted)' }}
      >
        {row.type === 'role' ? '◆' : '@'}
      </span>
      <span className="truncate">{row.name}</span>
      {row.hasRules && (
        <span
          aria-label="Tem regras neste canal"
          title="Tem regras neste canal"
          className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400"
        />
      )}
    </button>
  )
}

export default OverwriteTargetList
