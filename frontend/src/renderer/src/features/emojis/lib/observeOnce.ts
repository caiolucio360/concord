/**
 * Chama `onVisible` uma vez, quando `el` chega perto da área visível (200 px
 * de folga). Sem IntersectionObserver, chama na hora. Devolve o cancelamento.
 */
export function observeOnce(el: Element | null, onVisible: () => void): () => void {
  if (!el || typeof IntersectionObserver === 'undefined') {
    onVisible()
    return () => {}
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      observer.disconnect()
      onVisible()
    },
    { rootMargin: '200px' }
  )
  observer.observe(el)
  return () => observer.disconnect()
}
