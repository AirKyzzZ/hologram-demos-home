/**
 * Minimal structural type matching messages from `@2060.io/vs-agent-nestjs-client`.
 *
 * Keeping this structural (not importing the upstream lib) means:
 *  - `@holo/vs-agent-core` stays lightweight and has zero runtime deps
 *  - tests don't need the full NestJS/Credo stack installed
 *  - subclasses in consumer apps can still type-narrow to real upstream classes
 */
export interface HoloMessage {
  /** Upstream message class type string (e.g. "text", "media", "contextual-menu-select"). */
  type: string
  /** DIDComm connection ID — the stable identifier for a user. */
  connectionId: string
  /** Optional ISO timestamp from the agent. */
  timestamp?: string | Date
  /** Free-form payload — different message kinds carry different shapes. */
  [key: string]: unknown
}

/**
 * Canonical per-user conversation state.
 *
 * Consumers may persist this in their own database; we only require the
 * shape so that `BaseCoreService` can read and write it consistently.
 */
export interface HoloSession<TData extends Record<string, unknown> = Record<string, unknown>> {
  connectionId: string
  state: string
  language: string
  data: TData
  createdAt: Date
  updatedAt: Date
}

/**
 * Canonical message kinds we dispatch on. The strings are lowercased and
 * matched loosely against `HoloMessage.type`, which lets us accept both
 * `"text"` and `"TextMessage"`.
 */
export const MessageKind = {
  Text: 'text',
  Media: 'media',
  Profile: 'profile',
  ContextualMenuSelect: 'contextual-menu-select',
  IdentityProofRequest: 'identity-proof-request',
  IdentityProofSubmit: 'identity-proof-submit',
  Unknown: 'unknown',
} as const

export type MessageKindValue = (typeof MessageKind)[keyof typeof MessageKind]

/** Minimal structural logger — matches NestJS `Logger` shape without importing it. */
export interface HoloLogger {
  log(message: string, context?: string): void
  error(message: string, trace?: string, context?: string): void
  warn(message: string, context?: string): void
  debug(message: string, context?: string): void
}

export function isHoloMessage(value: unknown): value is HoloMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    typeof (value as { connectionId?: unknown }).connectionId === 'string'
  )
}
