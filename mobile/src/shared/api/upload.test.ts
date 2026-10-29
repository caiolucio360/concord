import { ApiError, refreshSession } from './client'
import { bindSession } from './session'
import { uploadFile } from './upload'

jest.mock('./client', () => ({ ...jest.requireActual('./client'), refreshSession: jest.fn() }))

const file = { uri: 'file:///a.png', name: 'a.png', mimeType: 'image/png' }
let accessToken: string | null = 'tok'

class FakeXhr {
  static instances: FakeXhr[] = []
  static replies: { status: number; body: string }[] = []
  headers: Record<string, string> = {}
  url = ''
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
  open(_method: string, url: string) {
    this.url = url
  }
  setRequestHeader(k: string, v: string) {
    this.headers[k] = v
  }
  abort() {
    this.onabort()
  }
  send() {
    const reply = FakeXhr.replies.shift() ?? { status: 200, body: '{"id":"x1"}' }
    this.onProgress({ lengthComputable: true, loaded: 5, total: 10 })
    this.status = reply.status
    this.responseText = reply.body
    this.onload()
  }
}

describe('uploadFile', () => {
  beforeEach(() => {
    FakeXhr.instances = []
    FakeXhr.replies = []
    jest.clearAllMocks()
    accessToken = 'tok'
    bindSession({ tokens: () => ({ accessToken, refreshToken: 'r' }), userId: () => 'u1', setTokens: jest.fn(), expire: jest.fn() })
    ;(global as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = FakeXhr
  })

  it('envia os campos antes do arquivo, com o token, medindo o progresso', async () => {
    const append = jest.spyOn(FormData.prototype, 'append')
    const onProgress = jest.fn()
    const body = await uploadFile<{ id: string }>('/x/y', file, { width: '4', height: '3' }, { onProgress })
    const xhr = FakeXhr.instances[0]
    expect(body).toEqual({ id: 'x1' })
    expect(xhr.url).toMatch(/\/x\/y$/)
    expect(xhr.headers.Authorization).toBe('Bearer tok')
    expect(onProgress).toHaveBeenCalledWith(0.5)
    expect(append.mock.calls.map(([name]) => name)).toEqual(['width', 'height', 'file'])
    expect(append.mock.calls[2][1]).toEqual({ uri: 'file:///a.png', name: 'a.png', type: 'image/png' })
  })

  it('arquivo sem tipo vai como octet-stream', async () => {
    const append = jest.spyOn(FormData.prototype, 'append')
    await uploadFile('/x', { ...file, mimeType: '' })
    expect(append.mock.calls.at(-1)?.[1]).toMatchObject({ type: 'application/octet-stream' })
  })

  it('erro do servidor: usa a mensagem do status ou a do corpo', async () => {
    FakeXhr.replies = [{ status: 413, body: '{"error":"muito grande"}' }]
    await expect(uploadFile('/x', file, {}, {}, { 413: 'A imagem pode ter até 10 MB.' })).rejects.toMatchObject({ status: 413, message: 'A imagem pode ter até 10 MB.' })
    FakeXhr.replies = [{ status: 500, body: '{"error":"quebrou"}' }]
    await expect(uploadFile('/x', file)).rejects.toMatchObject({ status: 500, message: 'quebrou' })
    FakeXhr.replies = [{ status: 500, body: 'oops' }]
    await expect(uploadFile('/x', file)).rejects.toMatchObject({ message: 'Upload failed' })
  })

  it('401: renova a sessão e tenta de novo com o token novo', async () => {
    FakeXhr.replies = [{ status: 401, body: '{}' }]
    jest.mocked(refreshSession).mockImplementation(async () => {
      accessToken = 'novo'
      return 'ok'
    })
    await uploadFile('/x', file)
    expect(FakeXhr.instances).toHaveLength(2)
    expect(FakeXhr.instances[1].headers.Authorization).toBe('Bearer novo')
  })

  it('401 sem renovação possível repassa o erro', async () => {
    FakeXhr.replies = [{ status: 401, body: '{}' }]
    jest.mocked(refreshSession).mockResolvedValue('rejected')
    await expect(uploadFile('/x', file)).rejects.toBeInstanceOf(ApiError)
  })

  it('sem token não manda o cabeçalho; cancelar antes de enviar aborta', async () => {
    accessToken = null
    await uploadFile('/x', file)
    expect(FakeXhr.instances[0].headers.Authorization).toBeUndefined()
    const controller = new AbortController()
    controller.abort()
    await expect(uploadFile('/x', file, {}, { signal: controller.signal })).rejects.toMatchObject({ message: 'aborted' })
  })

  it('abortar durante o envio rejeita com aborted', async () => {
    const controller = new AbortController()
    const original = FakeXhr.prototype.send
    FakeXhr.prototype.send = function () {
      controller.abort()
    }
    await expect(uploadFile('/x', file, {}, { signal: controller.signal })).rejects.toMatchObject({ message: 'aborted' })
    FakeXhr.prototype.send = original
  })
})
