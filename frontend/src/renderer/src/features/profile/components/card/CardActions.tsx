import { useState } from 'react'
import router from '../../../../app/router'
import { useFriendStore, useRelationship } from '../../../friends/store/friendStore'
import { useUserMenuStore } from '../../store/userMenuStore'
import { befriend, friendButtonOf } from '../../lib/cardFriendship'
import { isStranger, type ProfileRelationship } from '../../lib/profileRelationship'
import { showToast } from '../../../../shared/store/toastStore'
import { DotsIcon } from '../../../../shared/ui/icons'
import Button from '../../../../shared/ui/Button'
import IconButton from '../../../../shared/ui/IconButton'

interface CardActionsProps {
  userId: string
  /** Nome no menu "Mais" (apelido ou nome de exibição). */
  name: string
  displayName: string
  username?: string
  /** Vínculo comigo; sem vínculo (none) não há atalho para DM nem amizade. */
  relationship?: ProfileRelationship
  onClose: () => void
}

/**
 * "Enviar mensagem", "Adicionar amigo" e "Mais" no cartão de outra pessoa.
 * Quem não tem vínculo comigo (aberto pelo ranking) fica sem nenhum deles.
 */
function CardActions({
  userId,
  name,
  displayName,
  username,
  relationship: link,
  onClose
}: CardActionsProps): React.JSX.Element | null {
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

  if (isStranger(link)) return null

  return (
    <div className="mt-3 flex gap-2">
      <Button size="sm" onClick={sendMessage} className="flex-1">
        Enviar mensagem
      </Button>
      {friend && (
        <Button
          size="sm"
          variant={friend.incoming ? 'success' : 'secondary'}
          disabled={sending || friend.pending}
          onClick={() => void addFriend()}
        >
          {friend.label}
        </Button>
      )}
      <IconButton icon={DotsIcon} label="Mais" size="sm" variant="filled" onClick={openMore} />
    </div>
  )
}

export default CardActions
