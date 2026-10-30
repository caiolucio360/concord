# Design: ícones, tokens e componentes de `shared/ui`

O app segue o visual do Discord: ícones **preenchidos**, um anel de foco só,
cores por token semântico (os temas trocam tudo) e componentes base em
`frontend/src/renderer/src/shared/ui/`. A catraca `scripts/check-design.mjs`
roda no `affected-tests.mjs pr` e barra o diff que piora alguma regra.

## Regras

1. **Nada de emoji nem caractere Unicode como ícone** (✕ × ✓ ✗ ★ ▼ ••• ↺ ◆ 🔊 🎲…).
   Ícone é SVG de `shared/ui/icons`. Exceções: conteúdo do usuário (emoji da
   mensagem, do som, da enquete), notação de tecla (⌘ ⇧ ↑) e efeito visual.
2. **Nenhum `<svg>` de ícone fora de `shared/ui/icons/`.** Ícone novo entra no
   arquivo do grupo dele (`actions`, `media`, `nav`, `people`, `tools`,
   `effects`, `brand`). Gráfico de dados e logo de marca podem ter SVG próprio.
3. **Ícone:** preenchido (`fill="currentColor"`); traço só nos símbolos que são
   linha (setas, chevrons, X, check, +, #, @, barra). Sem cor própria: a cor
   vem do pai. Tamanho pela prop `size`: 12 (selo), 16 (texto, chip), 20
   (botão, menu; padrão), 24 (chamada, navegação). Sempre `aria-hidden`: o
   nome acessível fica no botão.
4. **Botão é `Button` ou `IconButton`.** `<button>` cru só para áreas clicáveis
   sem cara de botão (linha de lista, cartão, aba).
5. **Cor só por token** (`assets/theme.css`): `brand`, `danger`, `warning`,
   `success`, `text-strong|normal|secondary|muted|faint`, `bg-*`, véus `bg-fg/5…`.
   Nada de `violet-*`, `red-*`, `amber-*`, `emerald-*`… nem `[#hex]` em classe.
   Hex só em dado (paleta de preset, cor de nível, cor de anotação).
6. **Texto pela escala `text-ds-*`** (xxs 10, xs 12, sm 14, md 16, lg 20, xl 24);
   nada de `text-[Npx]`. Abaixo de 10 px não se lê no celular.
7. **Raio:** `rounded` (4 px: botão, campo, chip de cargo), `rounded-md` (6 px:
   botão de ícone, chip), `rounded-lg` (8 px: cartão, menu, popover),
   `rounded-xl` (12 px: modal) e `rounded-full` (avatar, switch, selo).
   `rounded-2xl`, `-3xl` e `-sm` saem.
8. **Foco visível em tudo que é interativo.** A regra base de `assets/focus.css`
   já dá o anel da marca a botão, link e controle com `role`; em componente
   próprio use `focus-ring` (ou `focus-ring-inset` dentro de contêiner com
   `overflow-hidden`). `outline-none` só junto de um substituto na mesma classe.
9. **Textos:** caixa de frase ("Adicionar figurinha"), reticências `…` (um
   caractere), botão sem ponto final, "Fechar" como rótulo do X. Texto que o
   usuário lê precisa de aprovação humana (AGENTS.md).

## Componentes

| Componente | API | Quando |
|---|---|---|
| `Button` | `variant`: primary, secondary, ghost, danger, success; `size`: sm (32 px), md (40 px, padrão), lg (44 px); `icon`; `loading` | Toda ação com texto. `loading` mostra o `Spinner` e trava o clique |
| `IconButton` | `icon` (componente de `icons`), `label` (obrigatório: vira `aria-label` e dica), `size`: xs (20 px, cresce no toque), sm (32), md (40 → 32 do `sm:` em diante), lg (44); `variant`: ghost, filled, danger, media | Botão só de ícone: apagar, mais ações, controles |
| `CloseButton` | = `IconButton` com o X; `label` padrão "Fechar" | Fechar modal, toast, aviso; remover anexo, cargo, resposta |
| `Switch` | `checked`, `onChange`, `label`, `disabled` | Liga/desliga. Bloqueado é `disabled`, não `pointer-events-none` (o teclado ainda alcança) |
| `Modal` | `open`, `title`, `onClose`, `wide`, `xl` | Diálogo. Já traz foco preso, Esc e o `CloseButton` |
| `Input` | atributos de `<input>` | Campo de texto |
| `Spinner` | `className` | Carregando, dentro de botão ou bloco |
| `ChipGroup` (`settings/components/profile/controls.tsx`) | `options` com `icon?` | Escolha entre poucas opções |

## Exemplos

Ruim:

```tsx
<button className="text-gray-400 hover:text-red-400 outline-none" onClick={onClose}>✕</button>
<button className="rounded-2xl bg-violet-600 px-3 py-1 text-[11px] active:scale-95">Salvar</button>
<span className="text-amber-300">★ Favoritos</span>
```

Problemas: ✕ é texto (cada sistema desenha de um jeito), o foco some, as cores
não seguem o tema, o tamanho e o raio estão fora da escala.

Bom:

```tsx
<CloseButton onClick={onClose} />
<Button size="sm" loading={saving}>Salvar</Button>
<span className="flex items-center gap-1 text-warning">
  <StarIcon size={16} /> Favoritos
</span>
<IconButton icon={TrashIcon} label="Apagar mensagem" variant="danger" onClick={onDelete} />
```

## A catraca (`scripts/check-design.mjs`)

```bash
node scripts/check-design.mjs              # diff contra origin/develop
node scripts/check-design.mjs --all        # quantas ocorrências restam no renderer
```

Olha os `.ts`/`.tsx` do renderer tocados no diff (sem testes) e soma, por regra,
as ocorrências antes e depois. Se alguma regra sobe, falha e lista os arquivos.
A soma (e não arquivo a arquivo) deixa extrair código de um god file para um
arquivo novo sem "piorar": o achado só mudou de lugar. Regras:

| Regra | O que pega |
|---|---|
| `icone-texto` | string ou texto JSX com seta, símbolo, forma, dingbat, emoji, `×` ou `•` |
| `texto-px` | `text-[Npx]` |
| `hex-classe` | `-[#hex]` em classe |
| `cor-crua` | `bg|text|border|ring|…-(violet|red|amber|emerald|…)-N` (os `gray-*` seguem o tema e passam) |
| `raio` | `rounded-2xl`, `-3xl`, `-sm` (com ou sem lado) |
| `outline-none` | `outline-none` sem nenhum `focus` na mesma classe |
| `svg` | `<svg>` fora de `shared/ui/icons/` e dos gráficos liberados |

Caso legítimo fora da whitelist (ex.: emoji sugerido que é conteúdo): comente
`// design-allow: <motivo>` na linha ou na linha de cima. Sem motivo não vale.
