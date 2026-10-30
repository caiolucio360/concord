# Zoom nas imagens do chat (issue #425): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar zoom e mover a imagem aberta em tela cheia (lightbox), no desktop/web e no app Android.

**Architecture:** a conta do zoom é uma função pura (`lib/imageZoom.ts`), copiada nos dois apps
como manda o ADR 0021: escala + deslocamento a partir do centro da tela, sempre presa entre 1x e 5x
e sem mostrar fundo além da borda da imagem. No desktop, um hook (`useImageZoom`) liga roda/pinça do
trackpad, arraste e pinça com pointer events, duplo clique e teclas (+ − 0 e setas) a essa conta e
aplica um `transform` CSS. No mobile, um hook (`useZoomGestures`) liga pinça, arraste com um dedo,
duplo toque e toque simples (fecha) da API v3 do react-native-gesture-handler a shared values do
reanimated, rodando no thread de UI.

**Tech Stack:** React 19 + Tailwind v4 (Electron/web), Expo/React Native com react-native-gesture-handler 3.3 e reanimated 4.7 (já no `mobile/package.json`), Vitest e Jest.

## Global Constraints

- Sem dependência nova (as do mobile já existem). Sem ADR: segue o padrão `lib/` + `hooks/` do repo.
- Gestos **e** barra de zoom (pedido do usuário no meio da execução): −, nível ("100%", toque volta ao tamanho inteiro) e +; rótulos "Diminuir zoom", "Voltar ao tamanho original", "Aumentar zoom" (texto novo: precisa de aprovação humana).
- Sempre a opção mais performática (pedido do usuário): no desktop o transform e o nível vão direto no DOM a cada frame (`requestAnimationFrame`), sem re-render; o state do React só muda nas pontas (1x/5x) e no começo/fim do arraste. No mobile os gestos rodam no thread de UI (worklets) e o nível só chega ao React no fim do gesto.
- Escala de 1x a 5x; duplo clique/toque alterna 1x ↔ 2x no ponto tocado.
- CRAP ≤ 15 em toda função tocada; o `MessageAttachments.tsx` do desktop **não** é tocado (tem funções com CRAP 42).
- Testes de componente do desktop sem jsdom: `renderToStaticMarkup` + `vi.stubGlobal('document', ...)` para o portal.
- Commits convencionais em português, sem atribuição de IA.

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `frontend/src/renderer/src/features/chat/lib/imageZoom.ts` (+ `.test.ts`) | conta do zoom (pura), igual à do mobile |
| `frontend/src/renderer/src/features/chat/lib/zoomInput.ts` (+ `.test.ts`) | roda, teclas, ponteiros, nível e classes do desktop |
| `frontend/src/renderer/src/features/chat/components/ZoomControls.tsx` (+ `.test.tsx`) | barra − nível + |
| `frontend/src/renderer/src/shared/ui/icons/actions.tsx` | `MinusIcon` |
| `frontend/src/renderer/src/features/chat/hooks/useImageZoom.ts` | liga eventos do DOM à conta |
| `frontend/src/renderer/src/features/chat/components/MediaLightbox.tsx` (+ `.test.tsx`) | aplica o transform; Esc e clique fora continuam fechando |
| `mobile/src/features/chat/lib/imageZoom.ts` (+ `.test.ts`) | mesma conta, com `'worklet'`, + `containSize` |
| `mobile/src/features/chat/hooks/useZoomGestures.ts` | gestos do gesture-handler v3 + shared values |
| `mobile/src/features/chat/components/ZoomBar.tsx` | barra − nível + |
| `mobile/src/features/chat/components/MediaLightbox.tsx` (+ `.test.tsx`) | usa os gestos; X e toque simples fecham |
| `mobile/src/features/chat/components/MessageAttachments.tsx` | passa largura/altura do anexo ao lightbox |
| `mobile/jest.setup.js`, `mobile/jest.config.js` | mock do gesture-handler e do reanimated que o lightbox usa |

---

### Task 1: conta do zoom (desktop)

**Files:** Create `frontend/src/renderer/src/features/chat/lib/imageZoom.ts`, Test `.../lib/imageZoom.test.ts`

**Interfaces — Produces:**
`ZoomView {scale,x,y}`, `Point {x,y}`, `ZoomBounds {width,height,viewWidth,viewHeight}`, `IDENTITY`,
`MIN_ZOOM=1`, `MAX_ZOOM=5`, `clampView(v,b)`, `zoomAt(v,scale,at,b)`, `panBy(v,dx,dy,b)`,
`toggleZoom(v,at,b)`, `pinchView(start,ratio,from,to,b)`, `wheelScale(scale,deltaY,ctrlKey)`,
`viewForKey(v,key,b): ZoomView | null`, `gestureView(start: {view, points: Point[]}, now: Point[], b)`.
Pontos são relativos ao centro da área visível.

- [ ] **Step 1: teste falhando** com os casos: `clampView` prende a escala em [1,5] e o deslocamento em `±max(0,(tam*escala−vista)/2)` (em 1x volta a 0); `zoomAt` mantém parado o ponto sob o cursor (`zoomAt(IDENTITY, 2, {x:100,y:0})` → `{2,-100,0}` numa imagem 800×600 em vista 800×600); `toggleZoom` amplia 2x no ponto e volta a `IDENTITY` quando ampliada; `pinchView` combina razão e deslocamento do ponto médio; `wheelScale(1,-100,false) > 1`, `wheelScale(2,100,false) < 2`, nunca sai de [1,5], pinça (`ctrlKey`) é mais sensível; `viewForKey` (`+`/`=` ampliam 1,25x no centro, `-` reduz, `0` volta, setas movem 60 px, outra tecla → `null`); `gestureView` com 1 ponto arrasta, com 2 faz pinça, com 0 devolve o início.
- [ ] **Step 2:** `cd frontend && npx vitest run src/renderer/src/features/chat/lib/imageZoom.test.ts` → FAIL (módulo não existe).
- [ ] **Step 3: implementação** (ver o código no commit; funções de complexidade ≤ 3).
- [ ] **Step 4:** mesmo comando → PASS.
- [ ] **Step 5:** `git commit -m "feat(chat): conta do zoom das imagens do lightbox"`.

### Task 2: lightbox do desktop com zoom

**Files:** Create `.../chat/hooks/useImageZoom.ts`, Modify `.../chat/components/MediaLightbox.tsx`, Test `.../components/MediaLightbox.test.tsx`

**Interfaces — Consumes:** Task 1. **Produces:** `useImageZoom(stageRef, imgRef) → { view, dragging, handlers, toggleAt, consumeDrag }`.

- [ ] **Step 1: teste falhando (SSR):** o lightbox renderiza `role="dialog"`, a imagem com `transform: translate(0px, 0px) scale(1)`, `cursor-zoom-in` e `touch-action: none` no palco.
- [ ] **Step 2:** `npx vitest run src/renderer/src/features/chat/components/MediaLightbox.test.tsx` → FAIL (sem transform).
- [ ] **Step 3:** hook: roda com listener `{ passive: false }` (o `preventDefault` evita o zoom da página na pinça do trackpad), pointer events no palco (mapa de ponteiros; recomeça o gesto quando o número de dedos muda; botão esquerdo do mouse só), teclas no `keydown` da janela, `dragging` para tirar a transição e trocar o cursor. Arraste maior que 4 px marca `moved`, e o clique seguinte no fundo não fecha. Componente: `onDoubleClick` na imagem chama `toggleAt`; classe `motion-safe:transition-transform` fora do gesto; `cursor-grab`/`cursor-grabbing` quando ampliada.
- [ ] **Step 4:** teste → PASS; `node scripts/affected-tests.mjs loop`.
- [ ] **Step 5:** conferir no app web em 360/768/1280 px (harness Vite + Playwright `channel: 'chrome'`): roda, arraste, duplo clique, Esc, clique fora.
- [ ] **Step 6:** `git commit -m "feat(chat): zoom e arraste na imagem aberta em tela cheia"`.

### Task 3: conta do zoom (mobile) + mocks do Jest

**Files:** Create `mobile/src/features/chat/lib/imageZoom.ts` (+ `.test.ts`), Modify `mobile/jest.setup.js`, `mobile/jest.config.js`

- [ ] **Step 1: teste falhando**: os mesmos casos de `clampView`, `zoomAt`, `panBy`, `toggleZoom`, `pinchView` da Task 1, e mais `containSize(800,600,400,800)` → `{400,300}`, com dimensões desconhecidas (0) → a própria vista.
- [ ] **Step 2:** `cd mobile && npx jest src/features/chat/lib/imageZoom.test.ts` → FAIL.
- [ ] **Step 3:** cópia adaptada (só a conta compartilhada, sem roda/teclas/ponteiros), cada função com `'worklet'` para rodar no thread de UI. No `jest.config.js`, `setupFiles` ganha `react-native-gesture-handler/jestSetup`; no `jest.setup.js`, o mock do reanimated ganha `default.View`, `useAnimatedStyle` e `withTiming`.
- [ ] **Step 4:** PASS + `npx jest src/features` continua verde.
- [ ] **Step 5:** `git commit -m "feat(mobile): conta do zoom das imagens do lightbox"`.

### Task 4: lightbox do mobile com pinça, arraste e duplo toque

**Files:** Create `mobile/src/features/chat/hooks/useZoomGestures.ts`, Modify `.../components/MediaLightbox.tsx`, `.../components/MessageAttachments.tsx`, Test `.../components/MediaLightbox.test.tsx`

**Interfaces — Consumes:** Task 3. **Produces:** `useZoomGestures(bounds, onClose) → { gesture, animatedStyle }`; `MediaLightbox` aceita `width?`/`height?`.

- [ ] **Step 1: teste falhando**: toque simples (`fireGestureHandler(getByGestureTestId('lightbox-toque'))`) chama `onClose`; o X continua fechando; o `MessageAttachments.test` continua verde.
- [ ] **Step 2:** `npx jest src/features/chat/components/MediaLightbox.test.tsx` → FAIL.
- [ ] **Step 3:** `usePinchGesture` (guarda início e ponto focal, chama `pinchView`), `usePanGesture({ maxPointers: 1 })` (`panBy` a partir do início), `useTapGesture({ numberOfTaps: 2 })` (`toggleZoom` com `withTiming`), `useTapGesture({ runOnJS: true })` que fecha só em 1x, `useExclusiveGestures(duplo, simples)` dentro de `useSimultaneousGestures(pinça, arraste, toques)`. `GestureHandlerRootView` dentro do `Modal` (no Android o Modal fica fora da raiz do app).
- [ ] **Step 4:** PASS; `node scripts/affected-tests.mjs loop`; `yarn typecheck` no mobile.
- [ ] **Step 5:** `git commit -m "feat(mobile): pinça, arraste e duplo toque na imagem aberta em tela cheia"`.

### Task 5: fechamento

- [ ] `node scripts/crap.mjs` e `node scripts/affected-tests.mjs pr` verdes (ou falhas só de ambiente, com a causa).
- [ ] Linha no `changelog/next.md` aprovada pelo usuário.
- [ ] Revisão por subagente; PR para `develop` só depois de confirmar com o usuário.
