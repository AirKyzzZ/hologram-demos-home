import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { Logger, ValidationPipe } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { getAppConfig } from './config'

async function bootstrap(): Promise<void> {
  const logger = new Logger('bootstrap')
  const config = getAppConfig()

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  })

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
  app.enableCors()

  // Graceful shutdown — required for 24/7 availability on k8s so pods drain
  // cleanly when rolling/updating rather than dropping in-flight messages.
  app.enableShutdownHooks()

  await app.listen(config.port, '0.0.0.0')
  logger.log(`${config.agentLabel} listening on port ${config.port}`)
  logger.log(`Health:    http://localhost:${config.port}/health`)
  logger.log(`Readiness: http://localhost:${config.port}/ready`)
  logger.log(`VS agent:  ${config.vsAgentAdminUrl}`)
}

bootstrap().catch(err => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error', err)
  process.exit(1)
})
