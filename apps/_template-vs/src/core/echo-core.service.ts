import { Inject, Injectable, Logger } from '@nestjs/common'
import type { HoloMessage } from '@holo/vs-agent-core'
import { EchoLogic } from './echo.logic'
import { VS_AGENT_SENDER, type VsAgentSender } from './message-sender'

/**
 * NestJS glue around `EchoLogic`. Exposes the `inputMessage` entry point
 * required by `@2060.io/vs-agent-nestjs-client`'s `EventHandler` interface.
 *
 * Deliberately NOT declaring `implements EventHandler` here so the template
 * can be built without `@2060.io/vs-agent-nestjs-client` installed (tests,
 * CI smoke). When you install the SDK in your real bot, add the import
 * and the `implements EventHandler` clause.
 */
@Injectable()
export class EchoCoreService extends EchoLogic {
  private readonly nestLogger = new Logger(EchoCoreService.name)

  constructor(@Inject(VS_AGENT_SENDER) sender: VsAgentSender) {
    super(sender, {
      log: (m, c) => new Logger(c ?? 'holo').log(m),
      error: (m, t, c) => new Logger(c ?? 'holo').error(m, t),
      warn: (m, c) => new Logger(c ?? 'holo').warn(m),
      debug: (m, c) => new Logger(c ?? 'holo').debug(m),
    })
  }

  /** Called by `EventsModule` in `@2060.io/vs-agent-nestjs-client`. */
  async inputMessage(message: unknown): Promise<void> {
    if (typeof message !== 'object' || message === null) {
      this.nestLogger.warn(`Dropped non-object message: ${typeof message}`)
      return
    }
    await this.dispatch(message as HoloMessage)
  }
}
