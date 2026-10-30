import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// SSR lê o estado atual do zustand.
vi.spyOn(React, 'useSyncExternalStore').mockImplementation((_subscribe, getSnapshot) => getSnapshot())

import { useAuthStore } from '../store/authStore'
import EmailVerifyBanner from './EmailVerifyBanner'

type User = NonNullable<ReturnType<typeof useAuthStore.getState>['user']>
function setUser(user: Partial<User> | null): void {
  useAuthStore.setState({ user: user as User | null })
}

describe('EmailVerifyBanner', () => {
  it('sem usuário ou com e-mail confirmado (ou conta antiga sem o campo), nada', () => {
    setUser(null)
    expect(renderToStaticMarkup(<EmailVerifyBanner />)).toBe('')
    setUser({ id: 'u', email: 'a@b.c', email_verified: true })
    expect(renderToStaticMarkup(<EmailVerifyBanner />)).toBe('')
    setUser({ id: 'u', email: 'a@b.c' })
    expect(renderToStaticMarkup(<EmailVerifyBanner />)).toBe('')
  })

  it('e-mail não confirmado: aviso, reenviar e dispensar com o X desenhado', () => {
    setUser({ id: 'u', email: 'ana@salinha.app', email_verified: false })
    const html = renderToStaticMarkup(<EmailVerifyBanner />)
    expect(html).toContain('Confirme seu e-mail (ana@salinha.app)')
    expect(html).toContain('Reenviar e-mail')
    expect(html).toContain('aria-label="Dispensar aviso"')
    expect(html).not.toContain('✕')
    expect(html).toContain('<svg')
  })
})
