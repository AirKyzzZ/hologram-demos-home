import { Injectable, Logger } from '@nestjs/common'

/**
 * Dependency-injection token for the message sender. Using a symbol means
 * nothing imports the real `@2060.io/vs-agent-nestjs-client` `ApiClient`
 * at the type level except the implementation file — keeping unit tests
 * decoupled from the upstream SDK.
 */
export const VS_AGENT_SENDER = Symbol('VS_AGENT_SENDER')

/**
 * Structural interface for whatever actually ships messages to the
 * vs-agent sidecar. In prod this is backed by `ApiClient`; in tests
 * a plain object/spy stands in.
 */
export interface VsAgentSender {
  sendText(connectionId: string, content: string): Promise<void>
}

/**
 * Real implementation — dynamically imports the upstream client so that
 * unit tests that replace the provider don't need the SDK on disk.
 *
 * This is the ONLY file in the template that knows about
 * `@2060.io/vs-agent-nestjs-client` directly. If the upstream SDK API
 * changes, you fix it here and every bot keeps working.
 */
@Injectable()
export class ApiClientVsAgentSender implements VsAgentSender {
  private readonly logger = new Logger(ApiClientVsAgentSender.name)
  private clientPromise: Promise<unknown> | null = null

  constructor(private readonly adminUrl: string) {}

  private async getClient(): Promise<{
    messages: { send(msg: unknown): Promise<unknown> }
  }> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        // Lazy import — defers the heavy SDK out of the startup path and
        // keeps jest from loading it during unit tests.
        //
        // NOTE: `@2060.io/vs-agent-nestjs-client` is intentionally NOT listed
        // in package.json — it's a ~200MB tree (NestJS + Credo + rhea) and
        // most of this template works without it. When you're ready to
        // actually talk to a real vs-agent, install it:
        //
        //   pnpm --filter template-vs add @2060.io/vs-agent-nestjs-client@1.5.5
        //
        // …and remove the two `@ts-expect-error` comments below.
        // @ts-expect-error optional runtime dep — install to enable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod: any = await import('@2060.io/vs-agent-nestjs-client')
        return new mod.ApiClient(this.adminUrl, mod.ApiVersion.V1)
      })()
    }
    return this.clientPromise as Promise<{ messages: { send(msg: unknown): Promise<unknown> } }>
  }

  async sendText(connectionId: string, content: string): Promise<void> {
    const client = await this.getClient()
    // @ts-expect-error optional runtime dep — install to enable
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import('@2060.io/vs-agent-nestjs-client')
    try {
      await client.messages.send(new mod.TextMessage({ connectionId, content }))
      this.logger.debug(`sent text to ${connectionId}: ${content.slice(0, 60)}`)
    } catch (err) {
      this.logger.error(
        `sendText failed for ${connectionId}: ${(err as Error).message}`,
        (err as Error).stack,
      )
      throw err
    }
  }
}
