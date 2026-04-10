import { BaseCoreService, type HoloMessage, type HoloLogger } from '@holo/vs-agent-core'
import type { VsAgentSender } from './message-sender'

/**
 * Pure, dependency-injected echo bot logic — no NestJS decorators, no SDK
 * imports. This is where all the unit tests land because it's trivial to
 * construct and observe.
 */
export class EchoLogic extends BaseCoreService {
  constructor(
    private readonly sender: VsAgentSender,
    logger?: HoloLogger,
  ) {
    super(logger)
  }

  protected async onTextMessage(message: HoloMessage): Promise<void> {
    const raw = String((message.content as string | undefined) ?? '').trim()

    if (!raw) {
      await this.sender.sendText(message.connectionId, "I didn't catch that — try sending some text.")
      return
    }

    if (raw.toLowerCase() === 'ping') {
      await this.sender.sendText(message.connectionId, 'pong')
      return
    }

    if (raw.toLowerCase() === 'help') {
      await this.sender.sendText(
        message.connectionId,
        'I am an echo bot. Type anything and I will repeat it back. Try "ping".',
      )
      return
    }

    await this.sender.sendText(message.connectionId, `Echo: ${raw}`)
  }

  protected async onProfileMessage(message: HoloMessage): Promise<void> {
    const displayName = (message['displayName'] as string | undefined) ?? 'friend'
    await this.sender.sendText(
      message.connectionId,
      `Nice to meet you, ${displayName}! Say "help" to see what I can do.`,
    )
  }

  protected async onUnknownMessage(message: HoloMessage): Promise<void> {
    // Don't reply on unknown messages — we'd risk echoing system messages.
    // The base class already logs a warning, which is enough.
    void message
  }
}
