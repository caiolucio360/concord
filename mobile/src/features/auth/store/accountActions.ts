import { changeEmail, changeUsername } from '../api/account'
import { useAuthStore, type User } from './authStore'

// Ações da própria conta que gravam o usuário que o servidor devolveu.

/** Grava a conta nova que o servidor devolveu. */
export function commitMe(latest: User): void {
  useAuthStore.getState().setUser(latest)
}

export async function changeMyUsername(username: string, password: string): Promise<void> {
  commitMe(await changeUsername(username, password))
}

export async function changeMyEmail(email: string, password: string): Promise<void> {
  commitMe(await changeEmail(email, password))
}
