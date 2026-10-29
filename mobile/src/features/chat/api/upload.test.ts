import { ApiError, refreshSession } from '../../../shared/api/client'
import { useAuthStore } from '../../auth/store/authStore'
import { roomPath, uploadAttachment } from './upload'

jest.mock('../../../shared/api/client', () => ({ ...jest.requireActual('../../../shared/api/client'), refreshSession: jest.fn() }))

const file = { uri: 'file:///a.png', name: 'a.png', mimeType: 'image/png', size: 10, width: 4, height: 3 }

class FakeXhr {
  static instances: FakeXhr[] = []
  static replies: { status: number; body: string }[] = []
  headers: Record<string, string> = {}
  url = ''
  method = ''
  sent: FormData | null = null
  status = 0
  responseText = ''
  upload = { addEventListener: (_: string, cb: (e: unknown) => void) => (this.onProgress = cb) }
  onProgress: (e: unknown) => void = () => {}
  onload: () => void = () => {}
  onerror: () => void = () => {}
  onabort: () => void = () => {}
  constructor() {
    FakeXhr.instances.push(this)
  }
  open(method: string, url: string) {
    this.method = method
    this.url = url
  }
  setRequestHeader(k: string, v: string) {
    this.headers[k] = v
  }
  abort() {
    this.onabort()
  }
  send(form: FormData) {
    this.sent = form
    const reply = FakeXhr.replies.shift() ?? { status: 200, body: '{"id":"att1"}' }
    this.onProgress({ lengthComputable: true, loaded: 5, total: 10 })
    this.status = reply.status
    this.responseText = reply.body
    this.onload()
  }
}

describe('upload de anexo', () => {
  beforeEach(() => {
    FakeXhr.instances = []
    FakeXhr.replies = []
    jest.clearAllMocks()
    ;(global as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = FakeXhr
    useAuthStore.setState({ accessToken: 'tok' } as never)
  })

  it('roomPath: canal e conversa', () => {
    expect(roomPath('channel:c1')).toBe('/channels/c1')
    expect(roomPath('conversation:d1')).toBe('/conversations/d1')
  })

  it('envia o arquivo com o token, mede o progresso e devolve o anexo', async () => {
    const append = jest.spyOn(FormData.prototype, 'append')
    const onProgress = jest.fn()
    const att = await uploadAttachment('channel:c1', file, { onProgress })
    const xhr = FakeXhr.instances[0]
    expect(att).toEqual({ id: 'att1' })
    expect(xhr.url).toMatch(/\/channels\/c1\/attachments$/)
    expect(xhr.headers.Authorization).toBe('Bearer tok')
    expect(onProgress).toHaveBeenCalledWith(0.5)
    expect(xhr.sent).toBeInstanceOf(FormData)
    expect(append.mock.calls.map(([name]) => name)).toEqual(['width', 'height', 'file'])
    expect(append.mock.calls[2][1]).toEqual({ uri: 'file:///a.png', name: 'a.png', type: 'image/png' })
  })

  it('erro do servidor vira ApiError com a mensagem', async () => {
    FakeXhr.replies = [{ status: 413, body: '{"error":"muito grande"}' }]
    await expect(uploadAttachment('channel:c1', file)).rejects.toMatchObject({ status: 413, message: 'muito grande' })
  })

  it('401: renova a sessão e tenta de novo com o token novo', async () => {
    FakeXhr.replies = [{ status: 401, body: '{}' }]
    jest.mocked(refreshSession).mockImplementation(async () => {
      useAuthStore.setState({ accessToken: 'novo' } as never)
      return 'ok'
    })
    await uploadAttachment('conversation:d1', file)
    expect(FakeXhr.instances).toHaveLength(2)
    expect(FakeXhr.instances[1].headers.Authorization).toBe('Bearer novo')
  })

  it('401 sem renovação possível repassa o erro; corpo que não é JSON também', async () => {
    FakeXhr.replies = [{ status: 401, body: 'oops' }]
    jest.mocked(refreshSession).mockResolvedValue('rejected')
    await expect(uploadAttachment('channel:c1', file)).rejects.toBeInstanceOf(ApiError)
  })

  it('cancelar aborta o envio', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(uploadAttachment('channel:c1', file, { signal: controller.signal })).rejects.toMatchObject({ message: 'aborted' })
  })
})
