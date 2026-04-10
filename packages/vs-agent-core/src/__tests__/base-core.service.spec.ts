import { BaseCoreService } from '../base-core.service'
import { MessageKind, type HoloLogger, type HoloMessage } from '../types'

function makeLogger(): HoloLogger & { calls: Array<[string, string, unknown]> } {
  const calls: Array<[string, string, unknown]> = []
  return {
    calls,
    log: (m, c) => calls.push(['log', m, c]),
    error: (m, t, c) => calls.push(['error', m, { t, c }]),
    warn: (m, c) => calls.push(['warn', m, c]),
    debug: (m, c) => calls.push(['debug', m, c]),
  }
}

class RecordingCoreService extends BaseCoreService {
  public text: HoloMessage[] = []
  public media: HoloMessage[] = []
  public menu: HoloMessage[] = []
  public unknown: HoloMessage[] = []
  public errors: Array<[Error, HoloMessage]> = []

  protected async onTextMessage(m: HoloMessage) {
    this.text.push(m)
  }
  protected async onMediaMessage(m: HoloMessage) {
    this.media.push(m)
  }
  protected async onContextualMenuSelect(m: HoloMessage) {
    this.menu.push(m)
  }
  protected async onUnknownMessage(m: HoloMessage) {
    this.unknown.push(m)
  }
  protected async onError(err: Error, m: HoloMessage) {
    this.errors.push([err, m])
  }
}

class BoomCoreService extends BaseCoreService {
  protected async onTextMessage(): Promise<void> {
    throw new Error('boom')
  }
}

class NoErrorOverrideCoreService extends BaseCoreService {}

describe('BaseCoreService', () => {
  it('dispatches text messages to onTextMessage', async () => {
    const svc = new RecordingCoreService(makeLogger())
    await svc.dispatch({ type: 'text', connectionId: 'c1', content: 'hi' })
    expect(svc.text).toHaveLength(1)
    expect(svc.text[0].content).toBe('hi')
    expect(svc.media).toHaveLength(0)
    expect(svc.unknown).toHaveLength(0)
  })

  it('dispatches TextMessage (PascalCase) to onTextMessage', async () => {
    const svc = new RecordingCoreService(makeLogger())
    await svc.dispatch({ type: 'TextMessage', connectionId: 'c1' })
    expect(svc.text).toHaveLength(1)
  })

  it('dispatches media messages to onMediaMessage', async () => {
    const svc = new RecordingCoreService(makeLogger())
    await svc.dispatch({ type: 'media', connectionId: 'c1' })
    expect(svc.media).toHaveLength(1)
    expect(svc.text).toHaveLength(0)
  })

  it('dispatches contextual menu selections', async () => {
    const svc = new RecordingCoreService(makeLogger())
    await svc.dispatch({ type: 'contextual-menu-select', connectionId: 'c1' })
    expect(svc.menu).toHaveLength(1)
  })

  it('dispatches unknown types to onUnknownMessage', async () => {
    const svc = new RecordingCoreService(makeLogger())
    await svc.dispatch({ type: 'totally-made-up', connectionId: 'c1' })
    expect(svc.unknown).toHaveLength(1)
  })

  it('routes errors thrown by handlers to onError without crashing', async () => {
    const errors: Error[] = []
    class TrackingBoom extends BaseCoreService {
      protected async onTextMessage(): Promise<void> {
        throw new Error('boom')
      }
      protected async onError(err: Error): Promise<void> {
        errors.push(err)
      }
    }
    const svc = new TrackingBoom(makeLogger())
    await expect(svc.dispatch({ type: 'text', connectionId: 'c1' })).resolves.toBeUndefined()
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toBe('boom')
  })

  it('default onError logs instead of rethrowing', async () => {
    const logger = makeLogger()
    const svc = new (class extends NoErrorOverrideCoreService {
      protected async onTextMessage(): Promise<void> {
        throw new Error('kaboom')
      }
    })(logger)
    await expect(svc.dispatch({ type: 'text', connectionId: 'c1' })).resolves.toBeUndefined()
    expect(logger.calls.some(([lvl, msg]) => lvl === 'error' && String(msg).includes('kaboom'))).toBe(
      true,
    )
  })

  it('logs debug line on every dispatch', async () => {
    const logger = makeLogger()
    const svc = new RecordingCoreService(logger)
    await svc.dispatch({ type: 'text', connectionId: 'c1' })
    expect(logger.calls.some(([lvl]) => lvl === 'debug')).toBe(true)
  })

  it('does nothing noisy if default no-op handlers are used', async () => {
    class Bare extends BaseCoreService {}
    const svc = new Bare(makeLogger())
    await expect(svc.dispatch({ type: 'text', connectionId: 'c1' })).resolves.toBeUndefined()
  })

  it('default classify maps upstream "TextMessage" type to Text kind', () => {
    class Exposed extends BaseCoreService {
      public test(msg: HoloMessage) {
        return this.classifyMessage(msg)
      }
    }
    const svc = new Exposed()
    expect(svc.test({ type: 'TextMessage', connectionId: 'c1' })).toBe(MessageKind.Text)
    expect(svc.test({ type: 'MediaMessage', connectionId: 'c1' })).toBe(MessageKind.Media)
    expect(svc.test({ type: 'IdentityProofSubmitMessage', connectionId: 'c1' })).toBe(
      MessageKind.IdentityProofSubmit,
    )
  })
})
