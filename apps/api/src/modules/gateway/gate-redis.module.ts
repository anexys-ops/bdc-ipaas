import { Global, Module } from '@nestjs/common';
import { GateRedisService } from './gate-redis.service';

@Global()
@Module({
  providers: [GateRedisService],
  exports: [GateRedisService],
})
export class GateRedisModule {}
