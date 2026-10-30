import { useAuthStore } from '../../auth/store/authStore'
import { useServerStore } from '../../servers/store/serverStore'
import { useServerAccess } from '../../servers/hooks/useServerAccess'
import { Perm } from '../../servers/lib/permissions'
import { PlusIcon } from '../../../shared/ui/icons'
import EmojiPickerGrid from '../../emojis/components/EmojiPickerGrid'
import { MAX_EMOJIS_PER_SERVER, type CustomEmoji } from '../../emojis/api/emojis'
import { useEmojiStore } from '../../emojis/store/emojiStore'

/** Contador e "Novo emoji" do servidor aberto (só com "Adicionar emojis"). */
function ServerEmojiBar({ serverId, onAdd }: { serverId: string; onAdd: () => void }): React.JSX.Element {
  const count = useEmojiStore((s) => s.groups.find((g) => g.server_id === serverId)?.emojis.length ?? 0)
  const canAdd = useServerAccess().can(Perm.ADD_EMOJIS)
  return (
    <div className="mb-2 flex items-center justify-between">
      <span className="text-[11px] text-gray-400">
        {count} / {MAX_EMOJIS_PER_SERVER} emojis
      </span>
      {canAdd && count < MAX_EMOJIS_PER_SERVER && (
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-7 items-center gap-1 rounded-md bg-violet-600/30 px-2 py-1 text-[11px] font-medium text-violet-300 transition-colors hover:bg-violet-600/50 focus-visible:outline-2 focus-visible:outline-brand cursor-pointer max-md:min-h-9"
        >
          <PlusIcon className="h-3 w-3" />
          <span>Novo emoji</span>
        </button>
      )}
    </div>
  )
}

/** Aba "Emojis" do seletor de mídia: personalizados dos seus servidores e o pack base. */
export default function EmojisTab({
  serverId,
  search,
  onSelect,
  onAdd
}: {
  serverId?: string | null
  search: string
  onSelect: (emoji: string) => void
  onAdd: () => void
}): React.JSX.Element {
  const meId = useAuthStore((s) => s.user?.id)
  const openServerId = useServerStore((s) => s.currentServer?.id)
  const canManage = useServerAccess().can(Perm.MANAGE_EXPRESSIONS)
  // Cargos só dá para conferir no servidor aberto; nos outros, só o próprio emoji.
  const canDelete = (e: CustomEmoji): boolean =>
    e.uploader_id === meId || (e.server_id === openServerId && canManage)
  const viewingServer = Boolean(serverId && serverId === openServerId)
  return (
    <div>
      {viewingServer && <ServerEmojiBar serverId={serverId as string} onAdd={onAdd} />}
      <EmojiPickerGrid search={search} mode="message" onPick={onSelect} canDelete={canDelete} />
    </div>
  )
}
