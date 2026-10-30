import { useEffect } from 'react'
import Modal from '../../../shared/ui/Modal'
import { useKeybindStore } from '../store/keybindStore'
import { useUIStore } from '../../../shared/store/uiStore'
import { bindingLabels } from '../lib/keybinds'
import { effectiveBindings } from '../lib/keybindPrefs'
import {
  SHORTCUTS,
  SHORTCUT_GROUP_LABELS,
  isMacPlatform,
  type ShortcutGroup
} from '../lib/shortcuts'
import SectionHeader from '../../../shared/ui/SectionHeader'

const GROUP_ORDER: ShortcutGroup[] = ['navigation', 'voice', 'chat']

/** Lista dos atalhos de teclado (Ctrl+/). */
function ShortcutsModal(): React.JSX.Element | null {
  const open = useUIStore((s) => s.shortcutsModalOpen)
  const setOpen = useUIStore((s) => s.setShortcutsModalOpen)
  const overrides = useKeybindStore((s) => s.overrides)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !e.defaultPrevented) setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, setOpen])

  if (!open) return null
  const isMac = isMacPlatform()
  const bindings = effectiveBindings(overrides)

  return (
    <Modal open title="Atalhos de teclado" onClose={() => setOpen(false)}>
      <div className="flex flex-col gap-5">
        {GROUP_ORDER.map((group) => {
          const defs = SHORTCUTS.filter((d) => d.group === group)
          if (defs.length === 0) return null
          return (
            <section key={group}>
              <SectionHeader className="mb-2">
                {SHORTCUT_GROUP_LABELS[group]}
              </SectionHeader>
              <ul className="flex flex-col gap-1.5">
                {defs.map((def) => (
                  <li key={def.id} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-200">{def.label}</span>
                    <span className="flex shrink-0 gap-1">
                      {bindingLabels(bindings[def.id] ?? 'Sem atalho', isMac).map((k) => (
                        <kbd
                          key={k}
                          className="rounded bg-fg/10 px-1.5 py-0.5 text-xs font-semibold text-strong"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </Modal>
  )
}

export default ShortcutsModal
