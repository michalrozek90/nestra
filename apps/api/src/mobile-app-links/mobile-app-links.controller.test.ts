import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NestFactory } from '@nestjs/core';

import { configureApiRouting } from '../api-routing';
import { MobileAppLinksController } from './mobile-app-links.controller';
import { MobileAppLinksModule } from './mobile-app-links.module';

describe('MobileAppLinksController', () => {
  const controller = new MobileAppLinksController();

  it('publishes the EAS signing certificate for the Nestra Android package', () => {
    assert.deepEqual(controller.getAndroidAssetLinks(), [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.michalrozek.nestra',
          sha256_cert_fingerprints: [
            '20:30:A4:B7:BF:1B:D5:FC:E5:E7:72:A7:34:0D:2B:E7:92:CF:2E:89:EA:97:E2:A1:60:B8:CF:29:9C:F1:31:97',
          ],
        },
      },
    ]);
  });

  it('returns a readable fallback without embedding authentication details', () => {
    const fallbackHtml = controller.getGoogleAuthReturnFallback();

    assert.match(fallbackHtml, /Nestra did not open automatically/);
    assert.match(fallbackHtml, /Nestra nie otworzyła się automatycznie/);
    assert.doesNotMatch(fallbackHtml, /code=|handoff|token|email/i);
    assert.doesNotMatch(fallbackHtml, /<script|<form/i);
  });

  it('serves public App Link routes outside the API prefix with safe responses', async (context) => {
    const application = await NestFactory.create(MobileAppLinksModule, { logger: false });
    configureApiRouting(application);
    await application.listen(0, '127.0.0.1');
    context.after(async () => application.close());

    const applicationUrl = await application.getUrl();
    const assetLinksResponse = await fetch(new URL('/.well-known/assetlinks.json', applicationUrl));
    const fallbackResponse = await fetch(
      new URL('/oauth/google?code=must-not-be-reflected', applicationUrl),
    );
    const assetLinks: unknown = await assetLinksResponse.json();
    const fallbackHtml = await fallbackResponse.text();

    assert.equal(assetLinksResponse.status, 200);
    assert.match(assetLinksResponse.headers.get('content-type') ?? '', /^application\/json/);
    assert.deepEqual(assetLinks, controller.getAndroidAssetLinks());
    assert.equal(fallbackResponse.status, 200);
    assert.match(fallbackResponse.headers.get('content-type') ?? '', /^text\/html/);
    assert.equal(fallbackResponse.headers.get('cache-control'), 'no-store');
    assert.equal(fallbackResponse.headers.get('referrer-policy'), 'no-referrer');
    assert.doesNotMatch(fallbackHtml, /must-not-be-reflected/);
  });
});
