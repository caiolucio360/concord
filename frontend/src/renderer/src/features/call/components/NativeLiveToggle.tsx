import { useEffect } from 'react'
import Switch from '../../../shared/ui/Switch'
import { nativeLiveToggleValue } from '../lib/nativeLiveChoice'
import { useNativeLiveStore } from '../store/nativeLiveStore'

/** "Transmitir pelo motor nativo (beta)": só aparece onde o helper existe (Linux). */
export default function NativeLiveToggle(): React.JSX.Element | null {
  const availability = useNativeLiveStore((s) => s.availability)
  const pref = useNativeLiveStore((s) => s.pref)
  const load = useNativeLiveStore((s) => s.load)
  const setPref = useNativeLiveStore((s) => s.setPref)
  useEffect(() => {
    void load()
  }, [load])
  if (!availability?.available) return null
  return (
    <div className="mt-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-ds-sm font-semibold text-secondary">
          Transmitir pelo motor nativo (beta)
        </p>
        <p className="mt-0.5 text-ds-xs text-faint">
          Codifica na placa de vídeo fora do navegador. Se falhar, a transmissão volta para o
          navegador.
        </p>
      </div>
      <Switch
        checked={nativeLiveToggleValue(pref, availability)}
        onChange={setPref}
        label="Transmitir pelo motor nativo (beta)"
      />
    </div>
  )
}
