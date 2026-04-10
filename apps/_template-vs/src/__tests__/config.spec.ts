import { getAppConfig } from '../config'

describe('getAppConfig', () => {
  it('applies sensible defaults when env is empty', () => {
    const config = getAppConfig({})
    expect(config.port).toBe(3003)
    expect(config.agentLabel).toBe('Template Bot')
    expect(config.vsAgentAdminUrl).toBe('http://localhost:3000')
    expect(config.agentPublicUrl).toBeUndefined()
  })

  it('reads APP_PORT from env', () => {
    const config = getAppConfig({ APP_PORT: '4200' })
    expect(config.port).toBe(4200)
  })

  it('throws on non-numeric APP_PORT', () => {
    expect(() => getAppConfig({ APP_PORT: 'abc' })).toThrow(/APP_PORT/)
  })

  it('throws on negative APP_PORT', () => {
    expect(() => getAppConfig({ APP_PORT: '-1' })).toThrow(/APP_PORT/)
  })

  it('throws on APP_PORT > 65535', () => {
    expect(() => getAppConfig({ APP_PORT: '99999' })).toThrow(/APP_PORT/)
  })

  it('reads VS_AGENT_ADMIN_URL', () => {
    const config = getAppConfig({ VS_AGENT_ADMIN_URL: 'http://vs-agent:3000' })
    expect(config.vsAgentAdminUrl).toBe('http://vs-agent:3000')
  })

  it('reads AGENT_LABEL and AGENT_PUBLIC_URL', () => {
    const config = getAppConfig({
      AGENT_LABEL: 'Custom',
      AGENT_PUBLIC_URL: 'https://dm.custom.example',
    })
    expect(config.agentLabel).toBe('Custom')
    expect(config.agentPublicUrl).toBe('https://dm.custom.example')
  })
})
