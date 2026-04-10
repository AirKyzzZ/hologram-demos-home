import { Module } from '@nestjs/common'
import { EchoCoreService } from './echo-core.service'
import { VS_AGENT_SENDER, ApiClientVsAgentSender } from './message-sender'
import { getAppConfig } from '../config'

@Module({
  providers: [
    {
      provide: VS_AGENT_SENDER,
      useFactory: () => new ApiClientVsAgentSender(getAppConfig().vsAgentAdminUrl),
    },
    EchoCoreService,
  ],
  exports: [EchoCoreService],
})
export class CoreModule {}
