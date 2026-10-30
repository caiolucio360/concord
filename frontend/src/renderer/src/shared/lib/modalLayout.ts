// Classes do Modal por tamanho. Desktop: janela centralizada. Celular: o
// modal pequeno (confirmações, formulários curtos) vira folha de baixo e o
// largo (editores com lista e painel) ocupa a tela toda, com as safe areas.
// Sem moldura (bare), o conteúdo cuida do próprio padding (ex.: BadgesModal).

const BACKDROP =
  'app-no-drag fixed inset-x-0 bottom-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm'
const DIALOG =
  'flex max-h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-subtle bg-modal shadow-2xl shadow-black/70'

const SHEET = {
  backdrop: 'max-sm:items-end max-sm:p-0',
  dialog:
    'max-sm:animate-sheet-in max-sm:max-h-[92%] max-sm:rounded-b-none max-sm:border-b-0 max-sm:px-4 max-sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]'
}

const FULL = {
  backdrop: 'max-md:p-0',
  dialog:
    'max-md:h-full max-md:max-h-none max-md:rounded-none max-md:border-0 max-md:px-4 max-md:pt-[max(1rem,env(safe-area-inset-top))] max-md:pb-[max(1rem,env(safe-area-inset-bottom))]'
}

/** Sem moldura (bare): o conteúdo desenha o próprio layout; só as safe areas no celular. */
const BARE = {
  backdrop: 'max-md:p-0',
  dialog:
    'relative max-md:h-full max-md:max-h-none max-md:rounded-none max-md:border-0 max-md:pt-[env(safe-area-inset-top)] max-md:pb-[env(safe-area-inset-bottom)]'
}

function widthClass(wide: boolean, xl: boolean): string {
  if (xl) return 'max-w-5xl'
  return wide ? 'max-w-3xl' : 'max-w-md'
}

function mobileLayout(wide: boolean, xl: boolean, bare: boolean): typeof SHEET {
  if (bare) return BARE
  return wide || xl ? FULL : SHEET
}

export function modalLayout({
  wide = false,
  xl = false,
  bare = false
}: {
  wide?: boolean
  xl?: boolean
  bare?: boolean
}): {
  backdrop: string
  dialog: string
  body: string
} {
  const mobile = mobileLayout(wide, xl, bare)
  return {
    backdrop: `${BACKDROP} ${mobile.backdrop}`,
    dialog: `${DIALOG} ${bare ? '' : 'p-6 '}${widthClass(wide, xl)} ${mobile.dialog}`,
    body: bare ? 'flex min-h-0 flex-1 flex-col' : 'min-h-0 overflow-y-auto overscroll-contain'
  }
}
