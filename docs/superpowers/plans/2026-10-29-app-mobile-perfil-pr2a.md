# App mobile, perfil, PR 2a (Skia: efeitos do tema e fundo/borda em degradê) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O cartão do perfil desenha o efeito animado do tema (as 10 cenas de canvas e as 3 que no desktop são CSS) e o fundo e a borda em degradê, com o Skia.

**Architecture:** As cenas do desktop (estado + passo de matemática pura + desenho num subconjunto de contexto 2D) e o laço são copiados e adaptados. Um adaptador (`skiaCtx.ts`) implementa esse subconjunto sobre o canvas do Skia; o laço grava cada quadro num `SkPicture` que vai para um `SharedValue` mostrado por `<Picture>` (padrão provado no spike, ADR 0024). O efeito pausa fora de foco e fica parado com "reduzir movimento".

**Tech Stack:** `@shopify/react-native-skia` 2.14.0 (já instalado, ADR 0024), Reanimated 4.7.1 (já no app), Jest com mock do Skia. **Sem dependência nova neste PR.**

**Spec:** `docs/superpowers/specs/2026-10-29-app-mobile-perfil-design.md`. Desvio da spec: o PR 2 foi dividido. **2a** (este): Skia, adaptador, 13 efeitos, fundo e borda em degradê. **2b**: nome estilizado e fontes. **2c**: brilho neon, animação da borda e textura.

## Global Constraints

- CRAP ≤ 15 em toda função tocada (`node scripts/crap.mjs --files ...` antes e depois); arquivo tocado acima de 400 linhas sai menor; nada de campo novo em `callStore`, `chatStore`, `serverStore`.
- Código, comentários, UI e commits em português; commits convencionais; sem `Co-Authored-By` nem atribuição de IA.
- Sem dependência nova no `package.json`.
- Efeitos: 30 fps, pausados quando a tela perde o foco ou o app vai ao fundo, parados (um quadro) se o sistema pedir "reduzir movimento". Falha no efeito nunca derruba a tela.
- Nenhum texto novo de interface neste PR.
- Responsivo 360/768 dp: o efeito e o fundo acompanham o tamanho medido do cartão (`onLayout`); cartão continua com no máximo 480 dp.
- Jest: `jest.mock` só referencia variáveis `mock*`; no mobile tudo é `await`. O Skia é módulo nativo: no Jest vem do mock global de `jest.setup.js`.
- Lógica portada fica em `lib/effects/` com comentário curto dizendo de onde veio (`frontend/src/renderer/src/features/profile/lib/effects/`).
- Repo e arquivos em CRLF: edite arquivos existentes por script que preserva o fim de linha; arquivos novos podem ser LF.
- Python no Windows lê stdin em cp1252: use `sys.stdin.reconfigure(encoding="utf-8")` ou arquivos, nunca acento via heredoc sem isso.

## Review Focus

1. Efeito com densidade, velocidade ou cor inválidas vindas do servidor: `effectParams` e as cenas não lançam erro e usam o padrão (Task 1).
2. Cartão com tamanho 0 (antes do `onLayout`) ou que encolhe/cresce (teclado, rotação): o efeito não é criado com 0×0 e recria ao medir (Task 5).
3. App vai para o segundo plano, tela perde o foco ou o usuário pede "reduzir movimento": o laço para e não há `requestAnimationFrame` pendente depois de desmontar (Task 4).
4. Efeito desconhecido ou `none`: o cartão não monta canvas nenhum (Task 5).
5. Falha do Skia ao gravar um quadro: o cartão continua visível sem efeito (Task 4).

---

## File Structure

```
mobile/jest.setup.js                                       (existe) + mock global do Skia
mobile/src/features/profile/
  lib/effects/                                             portado do desktop
    types.ts util.ts fakeCtx.ts index.ts loop.ts           contrato, contas, ctx falso, registro, laço
    fire.ts matrix.ts glitch.ts storm.ts galaxy.ts aurora.ts hearts.ts confetti.ts synthwave.ts rain.ts
    particles.ts sparkles.ts snow.ts                       NOVOS (no desktop eram CSS)
  lib/profileThemeExtras.ts                                (existe) + densityFactor, speedFactor, effectParams
  skia/
    skiaCtx.ts                                             adaptador Ctx -> SkCanvas
    useEffectPicture.ts                                    laço + pausa + reduzir movimento -> SharedValue<SkPicture>
    EffectCanvas.tsx                                       <Canvas><Picture/></Canvas> sobre o cartão
    CardFrame.tsx                                          fundo e borda em degradê (Skia)
  lib/cardLook.ts                                          (existe) + ângulo/cores do degradê
  components/card/ProfileCard.tsx                          (existe) usa CardFrame e EffectCanvas
```

---

### Task 1: Portar as cenas e o laço (lógica pura)

**Files:**
- Create: `lib/effects/{types,util,fakeCtx,index,loop,fire,matrix,glitch,storm,galaxy,aurora,hearts,confetti,synthwave,rain}.ts` e os testes `util.test.ts`, `loop.test.ts`, `scenes.test.ts` (copiados do desktop)
- Modify: `lib/profileThemeExtras.ts` (+ teste)

**Interfaces:**
- Produces: `Scene<S>`, `EffectParams { density: number; speed: number; color: string }`, `Rand`, `Ctx` (**só** os membros que as cenas usam: `clearRect fillRect beginPath closePath moveTo lineTo arc ellipse bezierCurveTo fill stroke save restore translate rotate scale createLinearGradient createRadialGradient fillStyle strokeStyle globalAlpha globalCompositeOperation lineWidth lineCap font textAlign textBaseline fillText`), `canvasScene(id: string): Scene | null`, `seededRand(seed: number): Rand`, `createEffectLoop(o: EffectLoopOptions): EffectLoop` com **`render: (draw: (ctx: Ctx) => void) => void`** no lugar de `ctx` (o Skia grava um quadro novo a cada vez), `stepDt`, `MAX_DT`; em `profileThemeExtras.ts`: `densityFactor(value: number): number`, `speedFactor(value: number): number`, `effectParams(extras: ProfileThemeExtras, defaultColor: string): EffectParams`.
- O tipo `Ctx` do desktop é `Pick<CanvasRenderingContext2D, ...>`: no mobile não existe `CanvasRenderingContext2D`, então declare as assinaturas à mão (copie as do DOM só para os membros acima).

- [ ] **Step 1: Copiar os testes** `util.test.ts`, `loop.test.ts`, `scenes.test.ts` e o de `profileThemeExtras` (partes de `densityFactor`/`speedFactor`/`effectParams`) trocando `vitest` por Jest (`vi.fn` → `jest.fn`, sem import de `vitest`, `expect(x, msg)` sem o segundo argumento). No `loop.test.ts`, troque a opção `ctx` por `render` (um `render` que chama `draw(fakeCtx)`).
- [ ] **Step 2: Rodar e ver falhar** — `cd mobile && yarn jest src/features/profile/lib/effects src/features/profile/lib/profileThemeExtras` → falha por módulo inexistente.
- [ ] **Step 3: Copiar as libs** do desktop (sem `mount.ts`, `browserEnv.ts` nem `EffectCanvas`), narrando o `Ctx` e trocando `ctx` por `render` em `loop.ts`; trazer `densityFactor`, `speedFactor` e `effectParams` para `profileThemeExtras.ts` (importando `EffectParams` de `./effects/types`).
- [ ] **Step 4: Rodar** → verde. Acrescente o teste do Review Focus 1: `effectParams({ ...DEFAULT_EXTRAS, effect_density: 9999, effect_speed: -5, effect_color: 'x' }, '#ff7a1a')` devolve números finitos dentro dos limites e a cor padrão; cada cena do `canvasScene` roda `init`/`step`/`draw` com esses parâmetros sem lançar.
- [ ] **Step 5: Commit** — `feat(mobile): cenas de efeito do perfil e laço (portados do desktop)`

---

### Task 2: Efeitos que no desktop eram CSS (partículas, brilhos, neve)

**Files:**
- Create: `lib/effects/{particles,sparkles,snow}.ts`, `lib/effects/cssScenes.test.ts`
- Modify: `lib/effects/index.ts` (registro)

**Interfaces:**
- Consumes: `Scene`, `countFor`, `between`, `hexRgb`, `rgba` (Task 1).
- Produces: `particlesScene`, `sparklesScene`, `snowScene: Scene<...>` registradas em `canvasScene('particles' | 'sparkles' | 'snow')`.
- Comportamento (do `profileParticles.ts` e do CSS do desktop): partículas = bolinhas de 2–5 px que sobem devagar e piscam, 14 por padrão; brilhos = estrelas de 4 pontas (desenhe o `path`, sem fonte) de 8–14 px que pulsam, 10 por padrão; neve = bolinhas de 2–5 px que caem do topo com leve balanço, 18 por padrão, mais lentas. Quantidade = `countFor(base, density, 40)` (teto 40, como `MAX_CSS_PARTICLES`); velocidade vem do `dt` já multiplicado pelo laço; a cor é `params.color`.

- [ ] **Step 1: Testes** (por cena, com `fakeCtx`): `init(w, h, params, seededRand(1))` cria `countFor(base, density, 40)` partículas (padrão 14/10/18; `density: 2.7` nunca passa de 40); `step` move para cima (partículas, brilhos) ou para baixo (neve) e reaparece do lado oposto ao sair do cartão; `draw` usa `fill`/`fillRect` com `fillStyle` na cor do tema e `globalAlpha` entre 0 e 1; w ou h 0 não lança.
- [ ] **Step 2: Rodar e ver falhar; implementar as três cenas** (cada uma ≤ 70 linhas, funções pequenas).
- [ ] **Step 3: Registrar em `index.ts`** e acrescentar ao teste de registro de `scenes.test.ts` que `canvasScene` conhece os 13 ids de `PROFILE_EFFECTS` com `kind !== 'none'` e devolve `null` para `none` e para id desconhecido (Review Focus 4).
- [ ] **Step 4: Rodar tudo de `lib/effects` → verde. Commit** — `feat(mobile): efeitos de partículas, brilhos e neve do tema`

---

### Task 3: Adaptador do Skia e mock do Skia no Jest

**Files:**
- Create: `skia/skiaCtx.ts`, `skia/skiaCtx.test.ts`
- Modify: `mobile/jest.setup.js` (mock global de `@shopify/react-native-skia`)

**Interfaces:**
- Produces: `createSkiaCtx(canvas: SkCanvas): Ctx`.
- Mapeamento (provado no spike): `BlendMode.Plus` para `'lighter'`, `SrcOver` para o resto; `fillStyle`/`strokeStyle` string → `Skia.Color(string)` (aceita `rgba(...)`), degradê (`createLinearGradient`/`createRadialGradient` devolvem um objeto com `addColorStop`) → `Skia.Shader.MakeLinearGradient`/`MakeRadialGradient` com `TileMode.Clamp` e `setColor` branco; `globalAlpha` → `setAlphaf` aplicado por último; caminhos por `Skia.PathBuilder.Make()` (`moveTo`, `lineTo`, `cubicTo`, `close`, `addArc`/`addOval` para `arc`/`ellipse`) e `canvas.drawPath(builder.build(), paint)`; `stroke` usa `PaintStyle.Stroke`, `lineWidth` → `setStrokeWidth`, `lineCap` → `setStrokeCap`; `fillText` com `Skia.Font` (fonte do sistema, tamanho lido de `font`) e `textAlign`; `clearRect` → `canvas.clear(transparent)`; `save/restore/translate/rotate/scale` direto no canvas (rotate em radianos → graus).
- O mock global do Skia em `jest.setup.js` expõe o suficiente para o adaptador e para `Canvas`/`Picture` (componentes que renderizam um `View` com `testID`), e grava as chamadas num canvas falso reutilizável (`__mockSkiaCanvas()`), para os testes inspecionarem.

- [ ] **Step 1: Testes** com o canvas falso, um por grupo: retângulo e cor (`fillRect` desenha com a cor e o alfa), caminho preenchido (`beginPath/moveTo/lineTo/closePath/fill` → `drawPath` com os pontos), curva e arco/elipse, traço (`stroke` com largura e cap), degradê linear e radial (paradas e posições), `lighter` vira `BlendMode.Plus`, `save/translate/rotate/restore`, texto, `clearRect`, e cor inválida não lança (cai em transparente).
- [ ] **Step 2: Rodar e ver falhar; escrever o mock e o adaptador** (separe por grupos de métodos em funções pequenas; CRAP ≤ 15).
- [ ] **Step 3: Rodar → verde, `yarn typecheck`. Commit** — `feat(mobile): adaptador de contexto 2D sobre o Skia`

---

### Task 4: Laço do efeito (picture, pausa, reduzir movimento)

**Files:**
- Create: `skia/useEffectPicture.ts`, `skia/useEffectPicture.test.tsx`

**Interfaces:**
- Consumes: `canvasScene`, `createEffectLoop`, `seededRand`, `createSkiaCtx`, `EffectParams`.
- Produces: `useEffectPicture(effect: string, params: EffectParams, width: number, height: number): SharedValue<SkPicture> | null` — `null` quando o efeito não existe, `none`, ou `width`/`height` ≤ 0. Cria o laço (30 fps, `requestAnimationFrame`), grava cada quadro com `Skia.PictureRecorder()` e escreve em `picture.value`. **Pausa** quando `AppState.currentState !== 'active'` ou a tela perde o foco (`useIsFocused` do `expo-router`); **reduzir movimento** (`AccessibilityInfo.isReduceMotionEnabled()` e o evento `reduceMotionChanged`) chama `renderStill()` uma vez e não anima. Desmontar ou trocar de efeito/tamanho para o laço e chama `cancelAnimationFrame`. Erro ao gravar um quadro é engolido (o quadro anterior fica na tela).

- [ ] **Step 1: Testes** (Jest com `requestAnimationFrame` falso e relógio controlado; `AppState`/`AccessibilityInfo` simulados): devolve `null` para `none`, efeito desconhecido, largura 0; com efeito válido anima (o `picture` muda a ~30 fps); `AppState` vai a `background` → para (nenhum rAF novo) e volta → retoma; foco perdido → para; reduzir movimento ligado → desenha um quadro só e não agenda rAF; desmontar cancela o rAF pendente; trocar de tamanho recria a cena; `draw` que lança não derruba o hook (Review Focus 3 e 5).
- [ ] **Step 2: Rodar e ver falhar; implementar o hook** (separe `useAppActive`, `useReduceMotion` e `useIsFocused` em hooks de 5–10 linhas).
- [ ] **Step 3: Rodar → verde. Commit** — `feat(mobile): laço do efeito do perfil com pausa e reduzir movimento`

---

### Task 5: Fundo e borda em degradê e efeito no cartão

**Files:**
- Create: `skia/CardFrame.tsx`, `skia/EffectCanvas.tsx` e testes
- Modify: `lib/cardLook.ts` (+ teste), `components/card/ProfileCard.tsx` (+ teste)

**Interfaces:**
- Consumes: `useEffectPicture`, `effectParams`, `effectDef`, `resolveProfileTheme`, `PRIDE_PALETTE`/`PRIDE_STRIPES`.
- Produces: `cardLook` passa a devolver também `background: { kind: 'solid' | 'gradient' | 'pride'; colors: string[]; angle: number }` e `border: { kind: 'none' | 'solid' | 'neon' | 'rainbow' | 'gradient'; colors: string[]; width: number }` (os campos atuais continuam, como fallback); `effect: { id: string; params: EffectParams } | null`; `<CardFrame look width height>` desenha, num `Canvas` do Skia atrás do conteúdo, o fundo (cor, degradê linear no ângulo do tema, ou as 6 faixas do pride) e a borda (sólida, em degradê ou arco-íris; **neon** desenha como sólida: o brilho é do 2c); `<EffectCanvas effect params width height>` desenha o efeito por cima (`pointerEvents="none"`, `accessible={false}`); `ProfileCard` mede o cartão com `onLayout` e passa `width`/`height`; `0×0` não monta canvas (Review Focus 2). O `ProfileCard` continua com `maxWidth: 480` e com os mesmos textos.
- Sem fundo/borda/efeito (tema padrão) o cartão **não** monta nenhum `Canvas` (usa os estilos do React Native de hoje).

- [ ] **Step 1: Testes** — `cardLook`: gradiente de duas cores e ângulo 45 devolve `background.kind = 'gradient'`, as duas cores e `angle: 45`; pride devolve as 6 cores escurecidas; borda arco-íris devolve as 6 faixas; tema padrão devolve `kind: 'solid'` sem cores e `effect: null`; `effect: 'fire'` com `effect_color` devolve os parâmetros. `ProfileCard`: tema com degradê monta o `CardFrame` (mock do Skia expõe o `Canvas`); tema padrão não monta `Canvas`; tema com efeito monta o `EffectCanvas` e, antes do `onLayout`, não; efeito `none`/desconhecido não monta (Review Focus 4); os testes atuais do `ProfileCard` continuam verdes.
- [ ] **Step 2: Rodar e ver falhar; implementar** `cardLook`, `CardFrame`, `EffectCanvas` e a integração (cada componente ≤ 100 linhas).
- [ ] **Step 3: Rodar a suíte inteira do mobile e o `typecheck` → verde. Commit** — `feat(mobile): fundo, borda em degradê e efeito animado no cartão do perfil`

---

### Task 6: Verificação, revisão e PR

- [ ] **Step 1: `node scripts/affected-tests.mjs pr`** verde; guarde a saída do CRAP antes/depois.
- [ ] **Step 2: Em aparelho** (APK de dev com o Skia, backend local, contas `teste1`/`teste2` com tema `fire`, degradê e `matrix`/`rain`/`snow` aplicados por `PUT /api/users/me/profile`): conferir cada um dos 13 efeitos em 360 e 768 dp, a pausa ao ir para o segundo plano, o cartão sem efeito no tema padrão e a medida de quadros (`dumpsys gfxinfo`). Registrar o que não foi possível provar (celular físico).
- [ ] **Step 3: Revisão** (`superpowers:requesting-code-review`), tratar o retorno e **confirmar com o usuário antes de push e PR**.
