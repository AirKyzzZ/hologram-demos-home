import { StateMachine, InvalidTransitionError } from '../state-machine'

type State = 'idle' | 'compose' | 'review' | 'published'
type Event = 'start' | 'submit' | 'edit' | 'publish' | 'cancel'

function makeMachine() {
  return new StateMachine<State, Event>('idle', [
    ['idle', 'start', 'compose'],
    ['compose', 'submit', 'review'],
    ['review', 'edit', 'compose'],
    ['review', 'publish', 'published'],
    ['compose', 'cancel', 'idle'],
    ['review', 'cancel', 'idle'],
  ])
}

describe('StateMachine', () => {
  it('starts in the initial state', () => {
    expect(makeMachine().getState()).toBe('idle')
  })

  it('transitions on valid events', () => {
    const m = makeMachine()
    expect(m.send('start')).toBe('compose')
    expect(m.send('submit')).toBe('review')
    expect(m.send('publish')).toBe('published')
  })

  it('supports loops via edit → compose → submit → review', () => {
    const m = makeMachine()
    m.send('start')
    m.send('submit')
    m.send('edit')
    expect(m.getState()).toBe('compose')
    m.send('submit')
    expect(m.getState()).toBe('review')
  })

  it('throws InvalidTransitionError on disallowed events', () => {
    const m = makeMachine()
    expect(() => m.send('submit')).toThrow(InvalidTransitionError)
  })

  it('InvalidTransitionError carries from/event fields', () => {
    const m = makeMachine()
    try {
      m.send('publish')
      fail('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidTransitionError)
      expect((err as InvalidTransitionError).from).toBe('idle')
      expect((err as InvalidTransitionError).event).toBe('publish')
    }
  })

  it('can() returns true only for reachable events', () => {
    const m = makeMachine()
    expect(m.can('start')).toBe(true)
    expect(m.can('publish')).toBe(false)
    m.send('start')
    expect(m.can('cancel')).toBe(true)
    expect(m.can('publish')).toBe(false)
    m.send('submit')
    expect(m.can('publish')).toBe(true)
  })

  it('availableEvents lists reachable events from current state', () => {
    const m = makeMachine()
    expect(m.availableEvents().sort()).toEqual(['start'])
    m.send('start')
    expect(m.availableEvents().sort()).toEqual(['cancel', 'submit'])
  })

  it('reset jumps to an arbitrary state', () => {
    const m = makeMachine()
    m.send('start')
    m.reset('idle')
    expect(m.getState()).toBe('idle')
  })

  it('terminal state has no outgoing events', () => {
    const m = makeMachine()
    m.send('start')
    m.send('submit')
    m.send('publish')
    expect(m.availableEvents()).toEqual([])
    expect(() => m.send('cancel')).toThrow(InvalidTransitionError)
  })
})
