import { HealthController } from '../health/health.controller'

describe('HealthController', () => {
  it('/health returns status ok', () => {
    const ctrl = new HealthController()
    const res = ctrl.health()
    expect(res.status).toBe('ok')
    expect(typeof res.uptime).toBe('number')
    expect(res.uptime).toBeGreaterThanOrEqual(0)
    expect(res.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('/healthz returns the same shape', () => {
    const ctrl = new HealthController()
    const res = ctrl.healthz()
    expect(res.status).toBe('ok')
  })

  it('/ready returns status ok', () => {
    const ctrl = new HealthController()
    const res = ctrl.ready()
    expect(res.status).toBe('ok')
  })

  it('uptime grows over time', async () => {
    const ctrl = new HealthController()
    const first = ctrl.health()
    await new Promise(r => setTimeout(r, 1100))
    const second = ctrl.health()
    expect(second.uptime).toBeGreaterThanOrEqual(first.uptime)
  })

  it('timestamp is a valid ISO 8601 date', () => {
    const ctrl = new HealthController()
    const res = ctrl.health()
    expect(new Date(res.timestamp).toString()).not.toBe('Invalid Date')
  })

  it('version has a string value', () => {
    const ctrl = new HealthController()
    expect(typeof ctrl.health().version).toBe('string')
  })
})
