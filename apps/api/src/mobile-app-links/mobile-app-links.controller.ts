import { Controller, Get, Header } from '@nestjs/common';

type AndroidAssetLinkStatement = {
  readonly relation: readonly string[];
  readonly target: {
    readonly namespace: 'android_app';
    readonly package_name: string;
    readonly sha256_cert_fingerprints: readonly string[];
  };
};

const ANDROID_ASSET_LINKS: readonly AndroidAssetLinkStatement[] = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.michalrozek.nestra',
      // Certificate fingerprints are public identifiers, not signing credentials.
      sha256_cert_fingerprints: [
        '20:30:A4:B7:BF:1B:D5:FC:E5:E7:72:A7:34:0D:2B:E7:92:CF:2E:89:EA:97:E2:A1:60:B8:CF:29:9C:F1:31:97',
      ],
    },
  },
];

const GOOGLE_AUTH_RETURN_FALLBACK_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Return to Nestra</title>
    <style>
      :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #102b31; color: #f7f6f2; }
      main { box-sizing: border-box; width: min(40rem, 100%); padding: 2rem; }
      h1 { margin-top: 0; }
      p { line-height: 1.6; }
      section + section { margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #7a9599; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>Nestra did not open automatically</h1>
        <p>Close this page, return to Nestra, and start Google sign-in again.</p>
      </section>
      <section lang="pl">
        <h1>Nestra nie otworzyła się automatycznie</h1>
        <p>Zamknij tę stronę, wróć do Nestry i rozpocznij logowanie przez Google ponownie.</p>
      </section>
    </main>
  </body>
</html>`;

@Controller()
export class MobileAppLinksController {
  @Get('.well-known/assetlinks.json')
  @Header('Cache-Control', 'public, max-age=300')
  getAndroidAssetLinks(): readonly AndroidAssetLinkStatement[] {
    return ANDROID_ASSET_LINKS;
  }

  @Get('oauth/google')
  @Header('Cache-Control', 'no-store')
  @Header(
    'Content-Security-Policy',
    "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  )
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Content-Type-Options', 'nosniff')
  getGoogleAuthReturnFallback(): string {
    return GOOGLE_AUTH_RETURN_FALLBACK_HTML;
  }
}
