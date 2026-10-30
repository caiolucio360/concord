import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ScreenSourceInfo } from '../../../../../preload/index.d'
import { ScreenPickerTabs, ScreenSourceCard, ScreenSourceGrid } from './ScreenSourceGrid'

const noop = (): void => {}
const tela = { id: 's1', name: 'Tela 1', displayId: '1', thumbnail: 'data:x' } as ScreenSourceInfo
const janela = { id: 'w1', name: 'Bloco de notas', displayId: '', thumbnail: '' } as ScreenSourceInfo

describe('ScreenPickerTabs', () => {
  it('marca a aba atual', () => {
    const html = renderToStaticMarkup(<ScreenPickerTabs tab="window" onChange={noop} />)
    expect(html).toMatch(/text-strong">Aplicativos</)
    expect(html).toMatch(/border-transparent[^"]*">Telas</)
  })
})

describe('ScreenSourceCard', () => {
  it('escolhida: anel e marca; sem miniatura: ícone de monitor', () => {
    const html = renderToStaticMarkup(<ScreenSourceCard source={janela} selected onSelect={noop} />)
    expect(html).toContain('ring-2 ring-brand')
    expect(html).not.toContain('✓')
    expect(html.match(/<svg/g)).toHaveLength(2)
    expect(html).toContain('Bloco de notas')
  })

  it('não escolhida: miniatura e sem marca', () => {
    const html = renderToStaticMarkup(<ScreenSourceCard source={tela} selected={false} onSelect={noop} />)
    expect(html).toContain('<img')
    expect(html).not.toContain('bg-brand text-xs')
  })
})

describe('ScreenSourceGrid', () => {
  it('carregando: esqueleto; carregado e vazio: aviso', () => {
    expect(renderToStaticMarkup(<ScreenSourceGrid loaded={false} sources={[]} selected={null} onSelect={noop} />)).not.toContain('Nenhuma opção')
    expect(renderToStaticMarkup(<ScreenSourceGrid loaded sources={[]} selected={null} onSelect={noop} />)).toContain('Nenhuma opção disponível.')
  })

  it('lista as fontes', () => {
    const html = renderToStaticMarkup(<ScreenSourceGrid loaded sources={[tela, janela]} selected="s1" onSelect={noop} />)
    expect(html).toContain('Tela 1')
    expect(html).toContain('Bloco de notas')
  })
})
