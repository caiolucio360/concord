import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Button from './Button'
import { PlusIcon } from './icons'

const html = (el: React.JSX.Element): string => renderToStaticMarkup(el)

describe('Button', () => {
  it('padrão: primário, médio (40 px), foco visível e sem encolher no clique', () => {
    const out = html(<Button>Salvar</Button>)
    expect(out).toContain('bg-brand')
    expect(out).toContain('min-h-10')
    expect(out).toContain('focus-ring')
    expect(out).not.toContain('active:scale')
  })

  it('tamanhos sm (32 px), md (40 px) e lg (44 px)', () => {
    expect(html(<Button size="sm">a</Button>)).toContain('min-h-8')
    expect(html(<Button size="md">a</Button>)).toContain('min-h-10')
    expect(html(<Button size="lg">a</Button>)).toContain('min-h-11')
  })

  it('type do chamador vale (submit em formulário)', () => {
    expect(html(<Button type="submit">a</Button>)).toContain('type="submit"')
  })

  it('nenhuma variante usa cor crua do Tailwind', () => {
    for (const variant of ['primary', 'secondary', 'ghost', 'danger', 'success'] as const) {
      expect(html(<Button variant={variant}>a</Button>)).not.toMatch(
        /\b(gray|red|emerald|violet|amber|green)-\d/
      )
    }
  })

  it('icon: desenha o ícone antes do rótulo, escondido do leitor de tela', () => {
    const out = html(<Button icon={PlusIcon}>Criar</Button>)
    expect(out).toMatch(/<svg[^>]*aria-hidden="true"[^>]*>.*<\/svg>Criar/)
  })

  it('loading: desabilita, marca aria-busy e troca o ícone pelo spinner', () => {
    const out = html(
      <Button loading icon={PlusIcon}>
        Criar
      </Button>
    )
    expect(out).toContain('disabled=""')
    expect(out).toContain('aria-busy="true"')
    expect(out).toContain('animate-spin')
    expect(out).not.toContain('<svg')
    expect(out).toContain('Criar')
  })
})
