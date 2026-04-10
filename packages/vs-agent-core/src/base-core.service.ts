import { MessageKind, type HoloLogger, type HoloMessage, type MessageKindValue } from './types'

const DEFAULT_LOGGER: HoloLogger = {
  log: (message, context) => console.log(`[${context ?? 'holo'}] ${message}`),
  error: (message, trace, context) => console.error(`[${context ?? 'holo'}] ${message}\n${trace ?? ''}`),
  warn: (message, context) => console.warn(`[${context ?? 'holo'}] ${message}`),
  debug: (message, context) => console.debug(`[${context ?? 'holo'}] ${message}`),
}

export type MessageHandlerHook<TMessage extends HoloMessage> = (message: TMessage) => Promise<void> | void

/**
 * Abstract base class for a VS agent's `CoreService`.
 *
 * Subclasses implement `@2060.io/vs-agent-nestjs-client`'s `EventHandler`
 * interface (specifically `inputMessage(message)`) and delegate to
 * `this.dispatch(message)`, which routes to a dedicated protected handler
 * per message kind. Subclasses override only the handlers they care about.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class EchoCoreService extends BaseCoreService implements EventHandler {
 *   async inputMessage(message: BaseMessage): Promise<void> {
 *     await this.dispatch(message as unknown as HoloMessage)
 *   }
 *
 *   protected async onTextMessage(message: HoloMessage): Promise<void> {
 *     await this.sendText(message.connectionId, `You said: ${message.content}`)
 *   }
 * }
 * ```
 */
export abstract class BaseCoreService<TMessage extends HoloMessage = HoloMessage> {
  protected readonly logger: HoloLogger

  constructor(logger: HoloLogger = DEFAULT_LOGGER) {
    this.logger = logger
  }

  /**
   * Route a single inbound message to the appropriate protected handler.
   * Subclasses typically call this from their `inputMessage` method.
   */
  async dispatch(message: TMessage): Promise<void> {
    try {
      this.logger.debug(
        `dispatch type=${message.type} connectionId=${message.connectionId}`,
        this.constructor.name,
      )

      const kind = this.classifyMessage(message)
      await this.runHandler(kind, message)
    } catch (err) {
      await this.onError(err instanceof Error ? err : new Error(String(err)), message)
    }
  }

  /**
   * Map the upstream `message.type` string to one of our canonical
   * `MessageKind` values.
   *
   * Normalizes by lowercasing, stripping separators (`-`, `_`), and trimming
   * a trailing `message` suffix. This lets the same map handle all of:
   *   - `text`, `TextMessage`, `text-message`, `text_message`
   *   - `contextual-menu-select`, `ContextualMenuSelectMessage`
   *   - `identity-proof-submit`, `IdentityProofSubmitMessage`
   *
   * Critically, using an exact map prevents false positives from substring
   * matching — e.g. `contextual-menu-select` contains the substring `text`
   * inside "con**text**ual", which a naive `includes('text')` check would
   * mis-route to the Text handler.
   *
   * Subclasses can override this entire method if their upstream message
   * naming diverges further.
   */
  protected classifyMessage(message: TMessage): MessageKindValue {
    const normalized = String(message.type)
      .toLowerCase()
      .replace(/[-_\s]/g, '')
      .replace(/message$/, '')

    switch (normalized) {
      case 'text':
        return MessageKind.Text
      case 'media':
        return MessageKind.Media
      case 'profile':
        return MessageKind.Profile
      case 'contextualmenuselect':
      case 'contextualmenuupdate':
        return MessageKind.ContextualMenuSelect
      case 'identityproofrequest':
        return MessageKind.IdentityProofRequest
      case 'identityproofsubmit':
        return MessageKind.IdentityProofSubmit
      default:
        return MessageKind.Unknown
    }
  }

  private async runHandler(kind: MessageKindValue, message: TMessage): Promise<void> {
    switch (kind) {
      case MessageKind.Text:
        return this.onTextMessage(message)
      case MessageKind.Media:
        return this.onMediaMessage(message)
      case MessageKind.Profile:
        return this.onProfileMessage(message)
      case MessageKind.ContextualMenuSelect:
        return this.onContextualMenuSelect(message)
      case MessageKind.IdentityProofRequest:
        return this.onIdentityProofRequest(message)
      case MessageKind.IdentityProofSubmit:
        return this.onIdentityProofSubmit(message)
      case MessageKind.Unknown:
      default:
        return this.onUnknownMessage(message)
    }
  }

  // ── default handler implementations: no-op, override in subclasses ─────

  protected async onTextMessage(_message: TMessage): Promise<void> {}
  protected async onMediaMessage(_message: TMessage): Promise<void> {}
  protected async onProfileMessage(_message: TMessage): Promise<void> {}
  protected async onContextualMenuSelect(_message: TMessage): Promise<void> {}
  protected async onIdentityProofRequest(_message: TMessage): Promise<void> {}
  protected async onIdentityProofSubmit(_message: TMessage): Promise<void> {}

  protected async onUnknownMessage(message: TMessage): Promise<void> {
    this.logger.warn(
      `Unknown message type "${message.type}" on connection ${message.connectionId}`,
      this.constructor.name,
    )
  }

  /**
   * Default error handler — logs and swallows so the dispatch loop never
   * crashes the agent process. Subclasses may override to rethrow or to
   * surface errors to a user via a text reply.
   */
  protected async onError(error: Error, message: TMessage): Promise<void> {
    this.logger.error(
      `Handler failed for type=${message.type} connection=${message.connectionId}: ${error.message}`,
      error.stack,
      this.constructor.name,
    )
  }
}
