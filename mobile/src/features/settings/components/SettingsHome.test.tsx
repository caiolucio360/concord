import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { useAuthStore } from '../../auth/store/authStore'
import { SettingsHome } from './SettingsHome'

jest.mock('../../auth/lib/secureTokens')

const user = { id: 'u1', username: 'ana', display_name: 'Ana', email: 'a@b.co' }
const props = { onBack: () => {}, onOpenSection: () => {} }

describe('SettingsHome', () => {
  beforeEach(() => {
    useAuthStore.setState({ ...useAuthStore.getInitialState(), status: 'signedIn', accessToken: 'a', refreshToken: 'r', user })
  })

  it('lista as seções por grupo e abre a escolhida', async () => {
    const onOpenSection = jest.fn()
    await render(<SettingsHome {...props} onOpenSection={onOpenSection} />)
    expect(screen.getByText('Configurações de usuário')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Minha conta' }))
    expect(onOpenSection).toHaveBeenCalledWith('account')
  })

  it('o voltar chama onBack', async () => {
    const onBack = jest.fn()
    await render(<SettingsHome {...props} onBack={onBack} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('Sair avisa o servidor e encerra a sessão local', async () => {
    const logout = jest.fn().mockResolvedValue(undefined)
    await render(<SettingsHome {...props} logout={logout} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }))
    await waitFor(() => expect(useAuthStore.getState().status).toBe('signedOut'))
    expect(logout).toHaveBeenCalled()
  })

  it('Sair encerra a sessão local mesmo se o servidor estiver fora', async () => {
    await render(<SettingsHome {...props} logout={jest.fn().mockRejectedValue(new Error('offline'))} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }))
    await waitFor(() => expect(useAuthStore.getState().status).toBe('signedOut'))
  })

  it('Sair tira o aparelho do push e sai da chamada antes de encerrar a sessão', async () => {
    const order: string[] = []
    const forgetPush = jest.fn(async () => void order.push(`push:${useAuthStore.getState().status}`))
    const leaveCall = jest.fn(async () => void order.push(`call:${useAuthStore.getState().status}`))
    await render(<SettingsHome {...props} logout={async () => {}} forgetPush={forgetPush} leaveCall={leaveCall} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }))
    await waitFor(() => expect(useAuthStore.getState().status).toBe('signedOut'))
    expect(order).toEqual(['call:signedIn', 'push:signedIn'])
  })

  it('falha ao tirar o push ou sair da chamada não impede de sair da conta', async () => {
    await render(
      <SettingsHome {...props} logout={async () => {}} forgetPush={jest.fn().mockRejectedValue(new Error('x'))} leaveCall={jest.fn().mockRejectedValue(new Error('y'))} />
    )
    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }))
    await waitFor(() => expect(useAuthStore.getState().status).toBe('signedOut'))
  })
})
