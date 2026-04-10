import { isHoloMessage, MessageKind } from '../types'

describe('isHoloMessage', () => {
  it('accepts valid message', () => {
    expect(isHoloMessage({ type: 'text', connectionId: 'c1' })).toBe(true)
  })

  it('rejects null', () => {
    expect(isHoloMessage(null)).toBe(false)
  })

  it('rejects missing type', () => {
    expect(isHoloMessage({ connectionId: 'c1' })).toBe(false)
  })

  it('rejects missing connectionId', () => {
    expect(isHoloMessage({ type: 'text' })).toBe(false)
  })

  it('rejects non-string type', () => {
    expect(isHoloMessage({ type: 42, connectionId: 'c1' })).toBe(false)
  })

  it('rejects primitives', () => {
    expect(isHoloMessage('nope')).toBe(false)
    expect(isHoloMessage(42)).toBe(false)
    expect(isHoloMessage(undefined)).toBe(false)
  })
})

describe('MessageKind', () => {
  it('exposes expected canonical kinds', () => {
    expect(MessageKind.Text).toBe('text')
    expect(MessageKind.Media).toBe('media')
    expect(MessageKind.Unknown).toBe('unknown')
  })
})
