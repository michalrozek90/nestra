import { RequestMethod, type INestApplication } from '@nestjs/common';

export function configureApiRouting(application: INestApplication): void {
  application.setGlobalPrefix('api/v1', {
    exclude: [
      { path: '.well-known/assetlinks.json', method: RequestMethod.GET },
      { path: 'oauth/google', method: RequestMethod.GET },
    ],
  });
}
