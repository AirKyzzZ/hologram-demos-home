import type { HoloSession } from './types'

/**
 * Minimal session-store interface. Keep it small so consumers can back it
 * with whatever they like (TypeORM, Redis, in-memory, Prisma...).
 */
export interface SessionStore<TData extends Record<string, unknown> = Record<string, unknown>> {
  get(connectionId: string): Promise<HoloSession<TData> | null>
  upsert(session: HoloSession<TData>): Promise<HoloSession<TData>>
  delete(connectionId: string): Promise<void>
  /** For tests and diagnostics. */
  size(): Promise<number>
}

/**
 * In-memory session store — useful for tests and for stateless-across-restart
 * bots. Not suitable for 24/7 production; use a TypeORM/Redis-backed store
 * there (the `apps/_template-vs` scaffold shows how).
 */
export function createInMemorySessionStore<
  TData extends Record<string, unknown> = Record<string, unknown>,
>(): SessionStore<TData> {
  const store = new Map<string, HoloSession<TData>>()

  return {
    async get(connectionId) {
      return store.get(connectionId) ?? null
    },
    async upsert(session) {
      const now = new Date()
      const existing = store.get(session.connectionId)
      const merged: HoloSession<TData> = {
        ...session,
        createdAt: existing?.createdAt ?? session.createdAt ?? now,
        updatedAt: now,
      }
      store.set(session.connectionId, merged)
      return merged
    },
    async delete(connectionId) {
      store.delete(connectionId)
    },
    async size() {
      return store.size
    },
  }
}
