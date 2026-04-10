import { createInMemorySessionStore } from '../session-store'
import type { HoloSession } from '../types'

function makeSession(connectionId: string, overrides: Partial<HoloSession> = {}): HoloSession {
  const now = new Date()
  return {
    connectionId,
    state: 'idle',
    language: 'en',
    data: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('createInMemorySessionStore', () => {
  it('returns null for unknown connection', async () => {
    const store = createInMemorySessionStore()
    expect(await store.get('nope')).toBeNull()
  })

  it('upsert creates a new session', async () => {
    const store = createInMemorySessionStore()
    const session = makeSession('c1')
    const saved = await store.upsert(session)
    expect(saved.connectionId).toBe('c1')
    expect(await store.size()).toBe(1)
  })

  it('upsert updates existing session and preserves createdAt', async () => {
    const store = createInMemorySessionStore()
    const initial = makeSession('c1', { state: 'idle' })
    await store.upsert(initial)
    const originalCreatedAt = initial.createdAt

    await new Promise(r => setTimeout(r, 5))
    const updated = await store.upsert(makeSession('c1', { state: 'compose' }))

    expect(updated.state).toBe('compose')
    expect(updated.createdAt.getTime()).toBe(originalCreatedAt.getTime())
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalCreatedAt.getTime())
    expect(await store.size()).toBe(1)
  })

  it('delete removes the session', async () => {
    const store = createInMemorySessionStore()
    await store.upsert(makeSession('c1'))
    await store.delete('c1')
    expect(await store.get('c1')).toBeNull()
    expect(await store.size()).toBe(0)
  })

  it('delete is a no-op for unknown connection', async () => {
    const store = createInMemorySessionStore()
    await expect(store.delete('nope')).resolves.toBeUndefined()
  })

  it('stores typed data payloads', async () => {
    interface MyData extends Record<string, unknown> {
      username: string
      count: number
    }
    const store = createInMemorySessionStore<MyData>()
    await store.upsert({
      connectionId: 'c1',
      state: 'idle',
      language: 'en',
      data: { username: 'alice', count: 3 },
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const fetched = await store.get('c1')
    expect(fetched?.data.username).toBe('alice')
    expect(fetched?.data.count).toBe(3)
  })
})
