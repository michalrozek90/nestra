import { Module } from '@nestjs/common';

import { MobileAppLinksController } from './mobile-app-links.controller';

@Module({
  controllers: [MobileAppLinksController],
})
export class MobileAppLinksModule {}
