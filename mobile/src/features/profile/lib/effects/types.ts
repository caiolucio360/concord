// Contrato dos efeitos animados do cartão de perfil (Fogo, Matrix, Glitch...). Cada efeito é uma "cena":
// estado simples + passo (só matemática, testável) + desenho num contexto 2D. Quem roda o laço e decide
// quando pausar é loop.ts. Portado de frontend/.../profile/lib/effects/types.ts; o contexto aqui é só o
// que as cenas usam, e o adaptador do Skia (skia/skiaCtx.ts) o implementa.

/** Gerador de números pseudoaleatórios em [0, 1). */
export type Rand = () => number

export interface EffectParams {
  /** Fator de quantidade: 1 = padrão; vai de ~0,4 a ~2,7. */
  density: number
  /** Fator de velocidade: 1 = padrão; vai de ~0,4 a ~2,4 (o laço já multiplica o dt). */
  speed: number
  /** Cor principal do efeito (#rrggbb, já validada). */
  color: string
}

export interface Gradient {
  addColorStop(offset: number, color: string): void
}

/** O pedaço do contexto 2D (como o do canvas do navegador) que as cenas usam. */
export interface Ctx {
  clearRect(x: number, y: number, w: number, h: number): void
  fillRect(x: number, y: number, w: number, h: number): void
  beginPath(): void
  closePath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  arc(x: number, y: number, radius: number, start: number, end: number, counterclockwise?: boolean): void
  ellipse(x: number, y: number, rx: number, ry: number, rotation: number, start: number, end: number, counterclockwise?: boolean): void
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void
  fill(): void
  stroke(): void
  fillText(text: string, x: number, y: number): void
  save(): void
  restore(): void
  translate(x: number, y: number): void
  rotate(angle: number): void
  scale(x: number, y: number): void
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): Gradient
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): Gradient
  fillStyle: string | Gradient
  strokeStyle: string | Gradient
  globalAlpha: number
  globalCompositeOperation: string
  lineWidth: number
  lineCap: string
  font: string
  textAlign: string
  textBaseline: string
}

export interface Scene<S = unknown> {
  /** Estado inicial para um cartão de w×h dp. */
  init(w: number, h: number, p: EffectParams, rand: Rand): S
  /** Avança dt segundos (já com a velocidade aplicada; dt ≤ 0,1). */
  step(s: S, dt: number, rand: Rand): void
  /** Desenha o quadro atual (o desenho já foi limpo). */
  draw(ctx: Ctx, s: S): void
}
