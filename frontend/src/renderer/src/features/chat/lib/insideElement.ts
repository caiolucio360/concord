/** O evento aconteceu dentro de `el` (ex.: rolagem da própria lista)? */
export function insideElement(el: Element | null, target: EventTarget | null): boolean {
  return Boolean(el) && target instanceof Node && Boolean(el?.contains(target))
}
