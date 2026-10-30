import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { EMOTE_CATEGORIES, type EmoteCategory } from '../../chat/lib/emotes'
import { serverIconSrc } from '../../servers/lib/serverIcon'
import { TrashIcon } from '../../../shared/ui/icons'
import SectionHeader from '../../../shared/ui/SectionHeader'
import { showToast } from '../../../shared/store/toastStore'
import type { CustomEmoji as Emoji, ServerEmojis } from '../api/emojis'
import { messageToken, reactionToken } from '../lib/emojiToken'
import { normalizeSearch, searchCategories } from '../lib/baseEmojis'
import { observeOnce } from '../lib/observeOnce'
import { useEmojiStore } from '../store/emojiStore'
import { useCustomEmojis } from '../hooks/useCustomEmojis'
import CustomEmoji from './CustomEmoji'

/** No texto vai <:nome:id>; na reação, <:id>. */
export type EmojiPickMode = 'message' | 'reaction'

const GRID = 'grid grid-cols-6 gap-1 max-md:grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))]'
const CELL =
  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ds-lg transition-transform hover:scale-110 hover:bg-fg/10 focus-ring max-md:size-11 max-md:text-ds-xl'
/** Altura de uma linha da grade (botão + espaço), para reservar o lugar das categorias fechadas. */
const ROW_PX = 36
/** As primeiras categorias montam na hora; as outras quando chegam perto da tela. */
const EAGER_SECTIONS = 2

/** Monta o conteúdo só quando chega perto da área visível (o pack tem ~1.900 emojis). */
function LazySection({
  eager,
  estimatedHeight,
  children
}: {
  eager: boolean
  estimatedHeight: number
  children: ReactNode
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(eager)
  useEffect(() => (visible ? undefined : observeOnce(ref.current, () => setVisible(true))), [visible])
  return (
    <div ref={ref} style={visible ? undefined : { height: estimatedHeight }}>
      {visible && children}
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <SectionHeader as="p" className="mb-1 flex items-center gap-1.5">
      {children}
    </SectionHeader>
  )
}

function ServerTitle({ group }: { group: ServerEmojis }): React.JSX.Element {
  const icon = serverIconSrc(group.server_icon_url)
  return (
    <SectionTitle>
      {icon ? (
        <img src={icon} alt="" width={14} height={14} className="h-3.5 w-3.5 rounded object-cover" />
      ) : (
        <span aria-hidden className="flex h-3.5 w-3.5 items-center justify-center rounded bg-fg/10 text-ds-xxs">
          {group.server_name.slice(0, 1)}
        </span>
      )}
      <span className="min-w-0 truncate normal-case">{group.server_name}</span>
    </SectionTitle>
  )
}

function CustomEmojiCell({
  emoji,
  onPick,
  onDelete
}: {
  emoji: Emoji
  onPick: (emoji: Emoji) => void
  onDelete?: (emoji: Emoji) => void
}): React.JSX.Element {
  return (
    <div className="group relative">
      <button type="button" title={`:${emoji.name}:`} aria-label={`:${emoji.name}:`} onClick={() => onPick(emoji)} className={CELL}>
        <CustomEmoji id={emoji.id} name={emoji.name} size="picker" />
      </button>
      {onDelete && (
        <button
          type="button"
          title="Excluir emoji"
          aria-label="Excluir emoji"
          onClick={() => onDelete(emoji)}
          className="absolute -right-1 -top-1 rounded bg-black/80 p-0.5 text-danger opacity-80 hover:opacity-100 focus-visible:opacity-100 focus-ring [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-80"
        >
          <TrashIcon aria-hidden className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  )
}

function BaseCategory({
  category,
  eager,
  onPick
}: {
  category: EmoteCategory
  eager: boolean
  onPick: (value: string) => void
}): React.JSX.Element {
  return (
    <LazySection eager={eager} estimatedHeight={20 + Math.ceil(category.items.length / 6) * ROW_PX}>
      <div className="mb-2">
        <SectionTitle>{category.name}</SectionTitle>
        <div className={GRID}>
          {category.items.map((item) => (
            <button
              key={item.emoji}
              type="button"
              title={item.label}
              aria-label={item.label}
              onClick={() => onPick(item.emoji)}
              className={CELL}
            >
              {item.emoji}
            </button>
          ))}
        </div>
      </div>
    </LazySection>
  )
}

/** Os grupos de emojis personalizados que batem com a busca (pelo nome). */
export function filterGroups(groups: ServerEmojis[], search: string): ServerEmojis[] {
  const q = normalizeSearch(search.trim())
  if (!q) return groups
  return groups
    .map((g) => ({ ...g, emojis: g.emojis.filter((e) => normalizeSearch(e.name).includes(q)) }))
    .filter((g) => g.emojis.length > 0)
}

/**
 * Grade do seletor de emoji: primeiro os emojis personalizados dos servidores
 * da pessoa (uma seção por servidor, com o ícone dele), depois o pack base.
 */
export default function EmojiPickerGrid({
  search,
  mode,
  onPick,
  canDelete
}: {
  search: string
  mode: EmojiPickMode
  onPick: (value: string) => void
  /** Pode apagar este emoji daqui? (sem: nenhuma lixeira) */
  canDelete?: (emoji: Emoji) => boolean
}): React.JSX.Element {
  useCustomEmojis()
  const groups = useEmojiStore((s) => s.groups)
  const base = useEmojiStore((s) => s.base)
  const remove = useEmojiStore((s) => s.remove)
  useEffect(() => void useEmojiStore.getState().ensureBase(), [])

  const customs = useMemo(() => filterGroups(groups, search), [groups, search])
  const categories = useMemo(() => searchCategories(base ?? EMOTE_CATEGORIES, search), [base, search])
  const searching = search.trim() !== ''
  const pickCustom = (e: Emoji): void => onPick(mode === 'message' ? messageToken(e) : reactionToken(e.id))
  const deleteCustom = (e: Emoji): void =>
    void remove(e.server_id, e.id).catch(() => showToast.error('Não foi possível excluir o emoji.'))

  return (
    <div>
      {customs.map((group) => (
        <div key={group.server_id} className="mb-2">
          <ServerTitle group={group} />
          <div className={GRID}>
            {group.emojis.map((e) => (
              <CustomEmojiCell key={e.id} emoji={e} onPick={pickCustom} onDelete={canDelete?.(e) ? deleteCustom : undefined} />
            ))}
          </div>
        </div>
      ))}
      {categories.map((category, i) => (
        <BaseCategory key={category.id} category={category} eager={searching || i < EAGER_SECTIONS} onPick={onPick} />
      ))}
      {customs.length === 0 && categories.length === 0 && (
        <div className="py-4 text-center text-ds-xs text-faint">Nenhum emote encontrado</div>
      )}
    </div>
  )
}
