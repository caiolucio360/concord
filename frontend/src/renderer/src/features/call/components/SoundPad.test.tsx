import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { SoundboardItem } from '../api/soundboard'
import SoundPad from './SoundPad'

const sound = {
  id: 's1',
  name: 'Buzina',
  emoji: '',
  server_id: 'srv',
  uploader_id: 'ana',
  uploader_name: 'Ana',
  duration_ms: 1500
} as unknown as SoundboardItem

const render = (over: Partial<SoundboardItem> = {}): string =>
  renderToStaticMarkup(
    <SoundPad
      sound={{ ...sound, ...over }}
      isFavorite={false}
      recordingKey={false}
      canDelete={false}
      isPlaying={false}
      onTrigger={() => {}}
      onToggleFavorite={() => {}}
      onStartRecordKey={() => {}}
      onDelete={() => {}}
    />
  )

describe('SoundPad', () => {
  it('som sem emoji mostra o ícone da mesa, não o 🔊', () => {
    const html = render()
    expect(html).not.toContain('🔊')
    expect(html).toMatch(/text-ds-lg">(?:<svg)/)
  })

  it('o emoji do som é conteúdo e continua', () => {
    expect(render({ emoji: '🎺' } as Partial<SoundboardItem>)).toContain('🎺')
  })

  it('duração e quem enviou separados por ·', () => {
    expect(render()).toContain('1.5s · Ana')
  })
})
