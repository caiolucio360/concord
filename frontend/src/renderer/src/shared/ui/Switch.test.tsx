import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Switch from './Switch'

const noop = (): void => {}

describe('Switch', () => {
  it('é um role=switch com rótulo, estado e foco visível', () => {
    const out = renderToStaticMarkup(<Switch checked label="Notificações" onChange={noop} />)
    expect(out).toContain('role="switch"')
    expect(out).toContain('aria-checked="true"')
    expect(out).toContain('aria-label="Notificações"')
    expect(out).toContain('focus-ring')
    expect(out).not.toContain('disabled=""')
  })

  it('disabled: não liga nem desliga e mostra que está bloqueado', () => {
    const out = renderToStaticMarkup(<Switch checked={false} label="x" onChange={noop} disabled />)
    expect(out).toContain('disabled=""')
    expect(out).toContain('disabled:opacity-50')
    expect(out).toContain('disabled:cursor-not-allowed')
  })
})
