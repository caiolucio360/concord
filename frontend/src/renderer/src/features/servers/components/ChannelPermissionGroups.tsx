import { triState, type TriState } from '../lib/channelPermissions'
import { Perm, canGrant, type ChannelOverwrite } from '../lib/permissions'
import type { PermissionGroup } from '../lib/permissions'
import PermissionTriState from './PermissionTriState'

/** As permissões do canal por grupo, cada uma com negar / herdar / permitir. */
function ChannelPermissionGroups({
  groups,
  myChannelPerms,
  working,
  busy,
  onSet
}: {
  groups: PermissionGroup[]
  /** O que eu tenho no canal: só dá para mexer no que eu mesmo posso dar. */
  myChannelPerms: number
  working: ChannelOverwrite | undefined
  busy: boolean
  onSet: (bit: number, state: TriState) => void
}): React.JSX.Element {
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.title}>
          <h3 className="mb-2 text-ds-sm font-medium text-muted">{group.title}</h3>
          <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-fg/3">
            {group.permissions.map((p) => {
              const bit = Perm[p.name]
              const allowed = canGrant(myChannelPerms, bit)
              return (
                <li
                  key={p.name}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 ${
                    allowed ? '' : 'opacity-50'
                  }`}
                  title={allowed ? undefined : 'Você não tem essa permissão neste canal.'}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-strong">{p.label}</p>
                    <p className="text-ds-xs leading-snug text-muted">{p.description}</p>
                  </div>
                  <PermissionTriState
                    label={p.label}
                    state={triState(working, bit)}
                    disabled={!allowed || busy}
                    onChange={(state) => onSet(bit, state)}
                  />
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default ChannelPermissionGroups
