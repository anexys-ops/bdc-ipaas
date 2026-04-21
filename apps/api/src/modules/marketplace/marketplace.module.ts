import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceAdminController } from './marketplace-admin.controller';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceItemService } from './marketplace-item.service';
import { ConnectorsModule } from '../connectors/connectors.module';

@Module({
  imports: [ConnectorsModule, PrismaModule],
  controllers: [MarketplaceController, MarketplaceAdminController],
  providers: [MarketplaceService, MarketplaceItemService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
