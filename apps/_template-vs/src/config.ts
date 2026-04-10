export interface AppConfig {
  port: number
  agentLabel: string
  vsAgentAdminUrl: string
  agentPublicUrl: string | undefined
  agentPackPath: string | undefined
}

function readPort(env: NodeJS.ProcessEnv): number {
  const raw = env.APP_PORT ?? '3003'
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0 || n > 65535) {
    throw new Error(`APP_PORT must be a valid port number, got "${raw}"`)
  }
  return n
}

export function getAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: readPort(env),
    agentLabel: env.AGENT_LABEL ?? 'Template Bot',
    vsAgentAdminUrl: env.VS_AGENT_ADMIN_URL ?? 'http://localhost:3000',
    agentPublicUrl: env.AGENT_PUBLIC_URL,
    agentPackPath: env.AGENT_PACK_PATH,
  }
}
