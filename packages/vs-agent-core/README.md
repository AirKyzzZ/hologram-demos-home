# @holo/vs-agent-core

Shared primitives for building Verana / 2060.io / Hologram VS agents:

- `BaseCoreService` — abstract class that routes DIDComm messages to a set of overridable `on<Kind>Message` hooks. Drop into any NestJS bot that wires `@2060.io/vs-agent-nestjs-client`.
- `StateMachine` — tiny typed FSM for conversation flows. Zero deps.
- `createInMemorySessionStore` — for tests and stateless-restart bots.
- `HoloMessage`, `HoloSession`, `HoloLogger` — structural types so this package has **zero runtime dependencies**.

## Why structural types

`@2060.io/vs-agent-nestjs-client` pulls in NestJS, Credo, TypeORM, and rhea. Depending on it here would force every consumer of `vs-agent-core` — including tests — to install the whole stack. Instead we keep the surface structural and let each consuming app do the adapter work between the real upstream message classes and `HoloMessage`.

## Example

```ts
import { Injectable } from '@nestjs/common'
import {
  EventHandler,
  BaseMessage,
  TextMessage,
  ApiClient,
  ApiVersion,
} from '@2060.io/vs-agent-nestjs-client'
import { BaseCoreService, type HoloMessage } from '@holo/vs-agent-core'

@Injectable()
export class EchoCoreService extends BaseCoreService implements EventHandler {
  private readonly apiClient = new ApiClient(process.env.VS_AGENT_ADMIN_URL!, ApiVersion.V1)

  async inputMessage(message: BaseMessage): Promise<void> {
    await this.dispatch(message as unknown as HoloMessage)
  }

  protected async onTextMessage(message: HoloMessage): Promise<void> {
    const text = (message as unknown as TextMessage).content
    await this.apiClient.messages.send(
      new TextMessage({
        connectionId: message.connectionId,
        content: `You said: ${text}`,
      }),
    )
  }
}
```

## Tests

```bash
pnpm --filter @holo/vs-agent-core test
```
