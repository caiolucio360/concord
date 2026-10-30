import { fireEvent, render, screen } from '@testing-library/react-native'
import { ChannelHeader } from './ChannelHeader'

describe('ChannelHeader', () => {
  it('mostra o nome do canal com #', async () => {
    await render(<ChannelHeader name="chat-dos-brothers" onBack={() => {}} />)
    expect(screen.getByText('chat-dos-brothers')).toBeOnTheScreen()
  })

  it('conversa 1 a 1 usa @ e grupo não usa prefixo', async () => {
    const { rerender } = await render(<ChannelHeader name="Paulo" prefix="@" onBack={() => {}} />)
    expect(screen.getByText('@')).toBeOnTheScreen()
    await rerender(<ChannelHeader name="DEVS" prefix="" onBack={() => {}} />)
    expect(screen.queryByText('#')).toBeNull()
    expect(screen.queryByText('@')).toBeNull()
  })

  it('voltar chama onBack', async () => {
    const onBack = jest.fn()
    await render(<ChannelHeader name="geral" onBack={onBack} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('com onPressName o nome é um botão (abre o perfil da pessoa)', async () => {
    const onPressName = jest.fn()
    await render(<ChannelHeader name="Paulo" prefix="@" onBack={() => {}} onPressName={onPressName} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Paulo' }))
    expect(onPressName).toHaveBeenCalled()
  })

  it('com onCall, o botão de ligar aparece e liga; sem onCall, não aparece', async () => {
    const onCall = jest.fn()
    const { rerender } = await render(<ChannelHeader name="Paulo" prefix="@" onBack={() => {}} onCall={onCall} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar chamada de voz' }))
    expect(onCall).toHaveBeenCalled()
    await rerender(<ChannelHeader name="Paulo" prefix="@" onBack={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Iniciar chamada de voz' })).toBeNull()
  })

  it('sem onPressName o nome não é um botão', async () => {
    await render(<ChannelHeader name="geral" onBack={() => {}} />)
    expect(screen.queryByRole('button', { name: 'geral' })).toBeNull()
  })

  it('com onOpenMembers, o ícone de membros no canto direito (como no Discord); sem ele, não aparece', async () => {
    const onOpenMembers = jest.fn()
    const { rerender } = await render(<ChannelHeader name="geral" onBack={() => {}} onOpenMembers={onOpenMembers} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Membros' }))
    expect(onOpenMembers).toHaveBeenCalled()
    await rerender(<ChannelHeader name="geral" onBack={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Membros' })).toBeNull()
  })
})
