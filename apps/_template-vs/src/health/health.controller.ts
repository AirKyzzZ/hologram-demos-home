import { Controller, Get } from '@nestjs/common'

export interface HealthResponse {
  status: 'ok'
  uptime: number
  timestamp: string
  version: string
}

/**
 * Liveness + readiness endpoints for the k8s probes defined in
 * `deploy/charts/*-values.yaml`. Keep these fast, non-blocking, and
 * free of external dependencies — if this endpoint relies on the
 * database, a database blip will tear the pod down.
 */
@Controller()
export class HealthController {
  private readonly startedAt = Date.now()
  private readonly version = process.env['npm_package_version'] ?? '0.0.0'

  @Get('/health')
  health(): HealthResponse {
    return this.snapshot()
  }

  @Get('/healthz')
  healthz(): HealthResponse {
    return this.snapshot()
  }

  @Get('/ready')
  ready(): HealthResponse {
    return this.snapshot()
  }

  private snapshot(): HealthResponse {
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
      version: this.version,
    }
  }
}
