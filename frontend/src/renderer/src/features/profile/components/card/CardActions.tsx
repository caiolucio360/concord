import { useState } from 'react'
import router from '../../../../app/router'
import { useFriendStore, useRelationship } from '../../../friends/store/friendStore'
import { useUserMenuStore } from '../../store/userMenuStore'
import { befriend, friendButtonOf } from '../../lib/cardFriendship'
import { showToast } from '../../../../shared/store/toastStore'
import { DotsIcon } from '../../../../shared/ui/icons'

interface CardActionsProps {
  userId: string
  /** Nome no menu "Mais" (apelido ou nome de exibição). */
  name: string
  displayName: string
  username?: string
  onClose: () => void
}

/** "Enviar mensagem", "Adicionar amigo" e "Mais" no cartão de outra pessoa. */
function CardActions({
  userId,
  name,
  displayName,
  username,
  onClose
}: CardActionsProps): React.JSX.Element {
  const relationship = useRelationship(userId)
  const sendRequest = useFriendStore((s) => s.sendRequest)
  const accept = useFriendStore((s) => s.accept)
  const [sending, setSending] = useState(false)

  const sendMessage = (): void => {
    onClose()
    void router.navigate(`/dm/${userId}`)
  }

  const addFriend = async (): Promise<void> => {
    if (!username) return
    setSending(true)
    const notice = await befriend(relationship, username, displayName, { accept, sendRequest })
    setSending(false)
    if (notice) showToast[notice.kind](notice.message)
  }
  const friend = friendButtonOf(relationship, Boolean(username))

  const openMore = (e: React.MouseEvent<HTMLButtonElement>): void => {
    const currentMenu = useUserMenuStore.getState().target
    if (currentMenu && currentMenu.userId === userId) {
      useUserMenuStore.getState().close()
      return
    }
    const r = e.currentTarget.getBoundingClientRect()
    useUserMenuStore.getState().open({
      userId,
      name,
      username,
      x: r.left,
      y: r.bottom + 4,
      anchorEl: e.currentTarget
    })
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        onClick={sendMessage}
        className="flex-1 cursor-pointer rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-hover"
      >
        Enviar mensagem
      </button>
      {friend && (
        <button
          type="button"
          disabled={sending || friend.pending}
          onClick={() => void addFriend()}
          className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-default disabled:opacity-60 ${
            friend.incoming
              ? 'bg-success-strong text-white hover:bg-success-strong-hover'
              : 'bg-fg/10 text-strong hover:bg-fg/15'
          }`}
        >
          {friend.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Mais"
        title="Mais"
        onClick={openMore}
        className="flex cursor-pointer items-center justify-center rounded-lg bg-fg/10 px-2.5 text-gray-200 transition-colors hover:bg-fg/15"
      >
        <DotsIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

export default CardActions
