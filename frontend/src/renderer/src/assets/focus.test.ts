import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (name: string): string => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8')

describe('foco por teclado (focus.css)', () => {
  const css = read('focus.css')

  it('o app importa o focus.css', () => {
    expect(read('main.css')).toMatch(/@import '\.\/focus\.css';/)
  })

  it('define os utilitários focus-ring e focus-ring-inset com o contorno da marca', () => {
    expect(css).toMatch(/@utility focus-ring \{[^}]*&:focus-visible/)
    expect(css).toMatch(/@utility focus-ring-inset \{/)
    expect(css).toContain('var(--brand)')
  })

  it('regra base: botões, links e controles com role ganham o anel sem classe nenhuma', () => {
    const base = css.slice(css.indexOf('@layer base'))
    for (const sel of ['button', 'a[href]', "[role='button']", "[role='switch']", "[role='menuitem']", '[tabindex'])
      expect(base).toContain(sel)
    expect(base).toContain(':focus-visible')
  })
})
