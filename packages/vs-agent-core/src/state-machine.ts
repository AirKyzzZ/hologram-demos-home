export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: string,
    public readonly event: string,
  ) {
    super(`Invalid transition: event "${event}" is not allowed from state "${from}"`)
    this.name = 'InvalidTransitionError'
  }
}

/**
 * Tiny deterministic finite state machine.
 *
 * Designed to model conversation flows in a VS agent — small, typed,
 * auditable, no external deps.
 */
export class StateMachine<TState extends string, TEvent extends string = string> {
  private current: TState
  private readonly transitions: Map<TState, Map<TEvent, TState>>

  constructor(
    initial: TState,
    transitions: ReadonlyArray<readonly [TState, TEvent, TState]>,
  ) {
    this.current = initial
    this.transitions = new Map()
    for (const [from, event, to] of transitions) {
      if (!this.transitions.has(from)) this.transitions.set(from, new Map())
      this.transitions.get(from)!.set(event, to)
    }
  }

  getState(): TState {
    return this.current
  }

  can(event: TEvent): boolean {
    return this.transitions.get(this.current)?.has(event) ?? false
  }

  send(event: TEvent): TState {
    const next = this.transitions.get(this.current)?.get(event)
    if (next === undefined) {
      throw new InvalidTransitionError(this.current, event)
    }
    this.current = next
    return this.current
  }

  reset(state: TState): void {
    this.current = state
  }

  /** Snapshot the reachable events from the current state. */
  availableEvents(): TEvent[] {
    return Array.from(this.transitions.get(this.current)?.keys() ?? [])
  }
}
