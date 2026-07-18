import { Controller, Get } from '@nestjs/common';
import { applicationMetadata, type ApplicationMetadata } from '@nestra/contracts';

@Controller()
export class AppController {
  @Get()
  getApplicationMetadata(): ApplicationMetadata {
    return applicationMetadata;
  }
}
