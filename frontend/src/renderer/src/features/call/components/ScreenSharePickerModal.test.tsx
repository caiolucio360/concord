import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ScreenSharePickerModal from './ScreenSharePickerModal'

describe('ScreenSharePickerModal', () => {
  it('fechado (o main ainda não pediu uma fonte), não desenha nada', () => {
    expect(renderToStaticMarkup(<ScreenSharePickerModal />)).toBe('')
  })
})
