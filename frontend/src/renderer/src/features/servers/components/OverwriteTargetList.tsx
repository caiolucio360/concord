import type { OverwriteRow, OverwriteTargetRef } from '../lib/channelPermissions'
import type { MemberCandidate } from '../lib/overwriteEditor'
import { roleColorCss } from '../lib/permissions'
import Input from '../../../shared/ui/Input'
import { AtIcon } from '../../../shared/ui/icons'

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
    <div className="w-full shrink-0 sm:w-52">
      <Input
        placeholder="Adicionar membro"
        aria-label="Adicionar membro"
        value={adding}
        onChange={(e) => onAddingChange(e.target.value)}
        className="mb-2 text-ds-xs"
      />
      {adding.trim() && (
        <ul className="mb-2 max-h-40 overflow-y-auto rounded-lg border border-subtle bg-input p-1">
          {candidates.length === 0 && (
            <li className="px-2 py-1.5 text-ds-xs text-faint">Ninguém encontrado.</li>
          )}
          {candidates.map((c) => (
            <li key={`${c.ref.type}:${c.ref.id}`}>
              <button
                type="button"
                onClick={() => onAdd(c.ref)}
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-ds-xs text-normal hover:bg-fg/10"
              >
                <span className="text-faint">@</span>
                <span className="truncate">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <ul className="flex max-h-40 flex-col gap-0.5 overflow-y-auto sm:max-h-80">
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
      className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-ds-sm font-medium ${
        active ? 'bg-fg/10 text-strong' : 'text-muted hover:bg-fg/5'
      }`}
    >
      {row.type === 'role' ? (
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ background: roleColorCss(row.color) ?? 'var(--text-muted)' }}
        />
      ) : (
        <AtIcon size={12} className="shrink-0 text-muted" />
      )}
      <span className="truncate">{row.name}</span>
      {row.hasRules && (
        <span
          aria-label="Tem regras neste canal"
          title="Tem regras neste canal"
          className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
        />
      )}
    </button>
  )
}

export default OverwriteTargetList
