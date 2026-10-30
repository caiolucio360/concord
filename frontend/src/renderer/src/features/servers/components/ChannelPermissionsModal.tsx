import { useMemo, useState } from 'react'
import { useAuthStore } from '../../auth/store/authStore'
import { useServerStore } from '../store/serverStore'
import { useServerAccess } from '../hooks/useServerAccess'
import { showToast } from '../../../shared/store/toastStore'
import { deleteChannelOverwrite, setChannelOverwrite, type Channel } from '../api/channels'
import { actionErrorMessage } from '../lib/permissionErrors'
import { serverDisplayName } from '../lib/serverNames'
import {
  findOverwrite,
  isEmptyOverwrite,
  isPrivateChannel,
  privateOverwrite,
  targetRows,
  withTriState,
  type OverwriteTargetRef,
  type TriState
} from '../lib/channelPermissions'
import { channelPermissionsCopy, editorSelection, memberCandidates } from '../lib/overwriteEditor'
import { Perm, everyoneRole, type ChannelOverwrite } from '../lib/permissions'
import { channelPermissionGroups } from '../lib/permissionCatalog'
import Modal from '../../../shared/ui/Modal'
import Switch from '../../../shared/ui/Switch'
import ChannelPermissionGroups from './ChannelPermissionGroups'
import OverwriteEditorFooter from './OverwriteEditorFooter'
import OverwriteTargetList from './OverwriteTargetList'

interface ChannelPermissionsModalProps {
  channel: Channel | null
  onClose: () => void
}

/**
 * Permissões de um canal: torna o canal privado e libera ou nega permissões
 * para cargos e membros específicos (por cima do que o servidor dá).
 */
function ChannelPermissionsModal({
  channel,
  onClose
}: ChannelPermissionsModalProps): React.JSX.Element | null {
  const serverId = useServerStore((s) => s.currentServer?.id)
  const roles = useServerStore((s) => s.roles)
  const members = useServerStore((s) => s.currentMembers)
  const fetchChannels = useServerStore((s) => s.fetchChannels)
  const liveChannel = useServerStore((s) => s.channels.find((c) => c.id === channel?.id))
  const access = useServerAccess()
  const meId = useAuthStore((s) => s.user?.id) ?? ''
  const [selected, setSelected] = useState<OverwriteTargetRef | null>(null)
  const [draft, setDraft] = useState<ChannelOverwrite | null>(null)
  const [adding, setAdding] = useState('')
  const [busy, setBusy] = useState(false)

  const overwrites = liveChannel?.overwrites
  const everyone = everyoneRole(roles)
  const memberName = (id: string): string | undefined => {
    const m = members.find((x) => x.user_id === id)
    return m ? serverDisplayName(m, m) : undefined
  }
  const rows = useMemo(
    () => targetRows(overwrites, roles, (id) => memberName(id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overwrites, roles, members]
  )

  if (!channel || !liveChannel || !serverId) return null

  const { kind, title, privateHint } = channelPermissionsCopy(liveChannel)
  const groups = channelPermissionGroups(kind)
  const myChannelPerms = access.channelPerms(channel.id)
  const isPrivate = isPrivateChannel(overwrites, everyone?.id)
  const { current, saved, working, dirty, allRows } = editorSelection({
    rows,
    overwrites,
    selected,
    draft,
    memberName
  })

  const run = async (action: () => Promise<unknown>, okMessage?: string): Promise<boolean> => {
    setBusy(true)
    try {
      await action()
      await fetchChannels(serverId)
      if (okMessage) showToast.success(okMessage)
      return true
    } catch (err) {
      showToast.error(actionErrorMessage(err, 'Não foi possível mudar as permissões do canal.'))
      return false
    } finally {
      setBusy(false)
    }
  }

  const put = (o: ChannelOverwrite): Promise<unknown> =>
    setChannelOverwrite(serverId, channel.id, o.target_type, o.target_id, o.allow, o.deny)

  const togglePrivate = async (makePrivate: boolean): Promise<void> => {
    if (!everyone) return
    await run(async () => {
      await put(privateOverwrite(overwrites, everyone.id, makePrivate))
      // Quem torna privado sem ter acesso garantido por cargo não se tranca fora.
      if (makePrivate && !access.isOwner && !(access.perms & Perm.ADMINISTRATOR)) {
        await put(
          withTriState(
            findOverwrite(overwrites, { type: 'member', id: meId }),
            { type: 'member', id: meId },
            kind === 'voice' ? Perm.VIEW_CHANNEL | Perm.CONNECT : Perm.VIEW_CHANNEL,
            'allow'
          )
        )
      }
    })
  }

  const setState = (bit: number, state: TriState): void => {
    if (!current) return
    setDraft(withTriState(working, current, bit, state))
  }

  const save = async (): Promise<void> => {
    if (!draft) return
    const ok = isEmptyOverwrite(draft)
      ? await run(
          () => deleteChannelOverwrite(serverId, channel.id, draft.target_type, draft.target_id),
          'Permissões salvas!'
        )
      : await run(() => put(draft), 'Permissões salvas!')
    if (ok) setDraft(null)
  }

  const removeRules = async (): Promise<void> => {
    if (!current) return
    const ok = await run(
      () => deleteChannelOverwrite(serverId, channel.id, current.type, current.id),
      'Regras removidas.'
    )
    if (ok) {
      setDraft(null)
      setSelected(null)
    }
  }

  const addTarget = (ref: OverwriteTargetRef): void => {
    setSelected(ref)
    setDraft({ target_type: ref.type, target_id: ref.id, allow: 0, deny: 0 })
    setAdding('')
  }

  const candidates = memberCandidates(members, overwrites, adding.trim().toLowerCase())

  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      wide
    >
      <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-subtle bg-fg/3 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-strong">Canal privado</p>
          <p className="text-xs text-muted">{privateHint}</p>
        </div>
        <Switch
          checked={isPrivate}
          label="Canal privado"
          onChange={(on) => void togglePrivate(on)}
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <OverwriteTargetList
          adding={adding}
          onAddingChange={setAdding}
          candidates={candidates}
          rows={allRows}
          current={current}
          onSelect={(ref) => {
            setSelected(ref)
            setDraft(null)
          }}
          onAdd={addTarget}
        />

        <div className="min-w-0 flex-1">
          {current ? (
            <>
              <ChannelPermissionGroups
                groups={groups}
                myChannelPerms={myChannelPerms}
                working={working}
                busy={busy}
                onSet={setState}
              />
              <OverwriteEditorFooter
                busy={busy}
                canRemove={!!saved}
                canSave={dirty}
                onRemove={() => void removeRules()}
                onSave={() => void save()}
              />
            </>
          ) : (
            <p className="text-sm text-faint">
              Adicione um cargo ou membro para dar ou negar permissões só neste canal.
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default ChannelPermissionsModal
