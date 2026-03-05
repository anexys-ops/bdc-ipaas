import { Module } from '@nestjs/common';
import { ConnectorsController } from './connectors.controller';
import { ConnectorsService } from './connectors.service';
import { ConnectorRegistryService } from './connector-registry.service';

@Module({
  controllers: [ConnectorsController],
  providers: [ConnectorsService, ConnectorRegistryService],
  exports: [ConnectorsService, ConnectorRegistryService],
})
export class ConnectorsModule {}
