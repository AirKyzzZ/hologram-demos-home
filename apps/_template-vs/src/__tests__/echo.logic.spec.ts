import type { HoloLogger } from '@holo/vs-agent-core'
import { EchoLogic } from '../core/echo.logic'
import type { VsAgentSender } from '../core/message-sender'

const silentLogger: HoloLogger = {
  log: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
}

function makeSender(): VsAgentSender & { calls: Array<[string, string]> } {
  const calls: Array<[string, string]> = []
  return {
    calls,
    async sendText(connectionId, content) {
      calls.push([connectionId, content])
    },
  }
}

function make(sender: VsAgentSender): EchoLogic {
  return new EchoLogic(sender, silentLogger)
}

describe('EchoLogic', () => {
  it('echoes plain text', async () => {
    const sender = makeSender()
    const svc = make(sender)
    await svc.dispatch({ type: 'text', connectionId: 'c1', content: 'hello' })
    expect(sender.calls).toEqual([['c1', 'Echo: hello']])
  })

  it('replies "pong" to "ping" (case insensitive)', async () => {
    const sender = makeSender()
    const svc = make(sender)
    await svc.dispatch({ type: 'text', connectionId: 'c1', content: 'PING' })
    expect(sender.calls).toEqual([['c1', 'pong']])
  })

  it('replies with help text to "help"', async () => {
    const sender = makeSender()
    const svc = make(sender)
    await svc.dispatch({ type: 'text', connectionId: 'c1', content: 'help' })
    expect(sender.calls).toHaveLength(1)
    expect(sender.calls[0][1]).toMatch(/echo bot/i)
  })

  it('replies politely to empty/whitespace text', async () => {
    const sender = makeSender()
    const svc = make(sender)
    await svc.dispatch({ type: 'text', connectionId: 'c1', content: '   ' })
    expect(sender.calls).toHaveLength(1)
    expect(sender.calls[0][1]).toMatch(/didn't catch/)
  })

  it('trims whitespace around echoed text', async () => {
    const sender = makeSender()
    const svc = make(sender)
    await svc.dispatch({ type: 'text', connectionId: 'c1', content: '   hi   ' })
    expect(sender.calls[0][1]).toBe('Echo: hi')
  })

  it('greets on profile message with displayName', async () => {
    const sender = makeSender()
    const svc = make(sender)
    await svc.dispatch({ type: 'profile', connectionId: 'c1', displayName: 'Alice' })
    expect(sender.calls[0][1]).toMatch(/Alice/)
  })

  it('greets with fallback name when displayName missing', async () => {
    const sender = makeSender()
    const svc = make(sender)
    await svc.dispatch({ type: 'profile', connectionId: 'c1' })
    expect(sender.calls[0][1]).toMatch(/friend/)
  })

  it('ignores unknown message types silently', async () => {
    const sender = makeSender()
    const svc = make(sender)
    await svc.dispatch({ type: 'unrecognised-kind', connectionId: 'c1' })
    expect(sender.calls).toHaveLength(0)
  })

  it('does not crash when sender throws — error is swallowed', async () => {
    const sender: VsAgentSender = {
      async sendText() {
        throw new Error('network down')
      },
    }
    const svc = make(sender)
    await expect(svc.dispatch({ type: 'text', connectionId: 'c1', content: 'hi' })).resolves.toBeUndefined()
  })

  it('echoes the same connectionId back', async () => {
    const sender = makeSender()
    const svc = make(sender)
    await svc.dispatch({ type: 'text', connectionId: 'connection-abc-123', content: 'hi' })
    expect(sender.calls[0][0]).toBe('connection-abc-123')
  })

  it('handles multiple consecutive messages', async () => {
    const sender = makeSender()
    const svc = make(sender)
    await svc.dispatch({ type: 'text', connectionId: 'c1', content: 'one' })
    await svc.dispatch({ type: 'text', connectionId: 'c1', content: 'two' })
    await svc.dispatch({ type: 'text', connectionId: 'c1', content: 'three' })
    expect(sender.calls.map(c => c[1])).toEqual(['Echo: one', 'Echo: two', 'Echo: three'])
  })
})
