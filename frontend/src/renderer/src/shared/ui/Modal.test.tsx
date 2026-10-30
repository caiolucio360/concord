import { beforeEach, describe, expect, it, vi } from 'vitest'

// Sem DOM: o portal vira o próprio conteúdo.
vi.mock('react-dom', async (original) => ({
  ...(await original<typeof import('react-dom')>()),
  createPortal: (node: React.ReactNode) => node
}))

import { renderToStaticMarkup } from 'react-dom/server'
import Modal from './Modal'

describe('Modal', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { body: {} })
  })

  it('fechado, não renderiza nada', () => {
    expect(renderToStaticMarkup(<Modal open={false}>x</Modal>)).toBe('')
  })

  it('aberto, é um diálogo com título e conteúdo', () => {
    const html = renderToStaticMarkup(
      <Modal open title="Apagar canal" onClose={() => {}}>
        <p>conteúdo</p>
      </Modal>
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('Apagar canal')
    expect(html).toContain('conteúdo')
  })

  it('o fechar é o X desenhado (CloseButton), não o caractere ✕', () => {
    const html = renderToStaticMarkup(<Modal open onClose={() => {}} />)
    expect(html).not.toContain('✕')
    expect(html).toMatch(/aria-label="Fechar"[^>]*>(?:(?!<\/button>).)*<svg/)
    expect(html).toContain('focus-ring')
  })

  it('só tem o botão ✕ quando dá para fechar', () => {
    expect(renderToStaticMarkup(<Modal open onClose={() => {}} />)).toContain('aria-label="Fechar"')
    expect(renderToStaticMarkup(<Modal open />)).not.toContain('aria-label="Fechar"')
  })

  it('cabeçalho único: título na escala (text-ds-lg semibold) e o X ao lado', () => {
    const html = renderToStaticMarkup(<Modal open title="Banir" onClose={() => {}} />)
    expect(html).toMatch(/<h2 id="[^"]+" class="[^"]*text-ds-lg font-semibold text-strong[^"]*">Banir<\/h2>/)
    expect(html).not.toContain('text-lg')
  })

  it('sem moldura (bare): sem cabeçalho, o X no canto e o rótulo vindo do conteúdo', () => {
    const html = renderToStaticMarkup(
      <Modal open bare wide labelledBy="titulo" onClose={() => {}}>
        <h2 id="titulo">Badges</h2>
      </Modal>
    )
    expect(html).toContain('aria-labelledby="titulo"')
    expect(html.match(/<h2/g)?.length).toBe(1)
    expect(html).toMatch(/aria-label="Fechar"[^>]*class="[^"]*absolute/)
  })

  it('a largura segue wide e xl', () => {
    expect(renderToStaticMarkup(<Modal open />)).toContain('max-w-md')
    expect(renderToStaticMarkup(<Modal open wide />)).toContain('max-w-3xl')
    expect(renderToStaticMarkup(<Modal open xl />)).toContain('max-w-5xl')
  })
})
