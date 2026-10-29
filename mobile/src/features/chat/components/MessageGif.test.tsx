import { fireEvent, render, screen } from '@testing-library/react-native'
import { MessageGif } from './MessageGif'

describe('MessageGif', () => {
  it('mostra o GIF com o selo e a proporção dos metadados', async () => {
    await render(<MessageGif gifUrl="https://g/x.gif" metadata={{ width: 600, height: 300 }} />)
    expect(screen.getByText('GIF')).toBeOnTheScreen()
    expect(screen.getByLabelText('GIF').props.source).toEqual({ uri: 'https://g/x.gif' })
  })

  it('se não carregar, mostra "GIF indisponível"', async () => {
    await render(<MessageGif gifUrl="https://g/x.gif" />)
    await fireEvent(screen.getByLabelText('GIF'), 'error')
    expect(screen.getByText('GIF indisponível')).toBeOnTheScreen()
  })
})
