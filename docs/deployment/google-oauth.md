# Google OAuth environment and production-readiness runbook

This runbook configures the server-owned Google OpenID Connect flow described in
[ADR 010](../decisions/010-google-authentication-architecture.md). It covers local development,
private remote testing, and public production without storing credentials in the repository.

Domain purchase and ownership verification, Google project changes, OAuth brand approval, DNS,
and provider-dashboard secret entry are operator actions. Record only the non-secret evidence
listed at the end of this document. Never paste client secrets, transaction keys, provider codes,
tokens, complete callback URLs, or environment dumps into GitHub, chat, logs, or screenshots.

## Security invariants

- Use separate Google Cloud projects for test and production.
- Use a separate OAuth client for local development, private remote testing, and production.
- Production clients contain no localhost, test, preview, or developer-only URI.
- The only Google-authorized redirect is the API callback. Browser and native clients never call
  Google directly, so Authorized JavaScript origins stays empty.
- Request exactly `openid`, `email`, and `profile`; do not enable Google API scopes that Nestra does
  not use.
- The API owns the Google client ID and secret. Clients receive no Google credential.
- Keep Google credentials and the transaction-encryption key in ignored local environment files or
  Render managed environment variables.
- Keep Google authentication disabled until every value in an environment is complete and the API
  and matching client are deployed together.

Google recommends separate projects for testing and production, owned verified domains, a public
homepage and privacy policy, minimum scopes, maintained contacts, and HTTPS production redirects:
[production-readiness policy](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance).

## Environment model

Use names that make accidental cross-environment use visible. Actual Google project IDs and OAuth
client IDs are non-secret, but keep them in the operator inventory instead of hard-coding them.

| Nestra environment | Google project example    | OAuth client example       | Audience / status        |
| ------------------ | ------------------------- | -------------------------- | ------------------------ |
| Local development  | `nestra-oauth-test`       | `nestra-local-development` | External / Testing       |
| Private test       | `nestra-oauth-test`       | `nestra-private-test`      | External / Testing       |
| Public production  | `nestra-oauth-production` | `nestra-production`        | External / In production |

Local development and private test may share the test project, but never an OAuth client. The
production project and credentials must not be used from a developer machine or preview service.

### Exact URI inventory

Replace `<owned-domain>` with a domain whose ownership is verified in Google Search Console. Keep
one canonical host for each public surface and do not add aliases, wildcards, trailing slashes,
queries, or fragments.

| Environment | Google authorized redirect URI                                | Web return URI                                         | Android / iOS return URI                       | Windows return URI                             |
| ----------- | ------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------- | ---------------------------------------------- |
| Local       | `http://localhost:3000/api/v1/auth/google/callback`           | `http://localhost:8081/auth/google/callback`           | `com.michalrozek.nestra:/oauth/google`         | `com.michalrozek.nestra.desktop:/oauth/google` |
| Test        | `https://api-test.<owned-domain>/api/v1/auth/google/callback` | `https://app-test.<owned-domain>/auth/google/callback` | `https://app-test.<owned-domain>/oauth/google` | `com.michalrozek.nestra.desktop:/oauth/google` |
| Production  | `https://api.<owned-domain>/api/v1/auth/google/callback`      | `https://app.<owned-domain>/auth/google/callback`      | `https://app.<owned-domain>/oauth/google`      | `com.michalrozek.nestra.desktop:/oauth/google` |

The return URIs in the last three columns are owned by Nestra and configured in the API; they are
not Google authorized redirect URIs. Google redirects only to the API callback. The API then sends
the verifier-bound one-time handoff to the selected platform URI.

The production API callback and Web/mobile returns require HTTPS. Only loopback development and
the documented private development or Windows schemes are exceptions. Google also requires an
exact redirect match, including scheme, case, path, port, and trailing slash:
[Google Web Server OAuth redirect rules](https://developers.google.com/identity/protocols/oauth2/web-server#uri-validation).

## Create the Google Cloud projects

Perform these steps once for `nestra-oauth-test`, then repeat them independently for
`nestra-oauth-production`.

1. Create the Google Cloud project under the intended long-lived owner or organization.
2. Keep at least two current recovery-capable owners/editors when organizational policy permits.
   Remove former collaborators promptly.
3. On Google Auth Platform **Branding**, set:
   - app name: `Nestra`;
   - user support email: the monitored support address published in the privacy notice;
   - developer contact information: monitored operational addresses;
   - logo only when the final production asset is ready;
   - homepage and privacy-policy values described below for production.
4. On **Audience**, choose External. Keep the test project in Testing. Add only named private-test
   accounts. Do not use the production project as a test-user shortcut.
5. On **Data Access**, configure only:
   - `openid`;
   - `https://www.googleapis.com/auth/userinfo.email`;
   - `https://www.googleapis.com/auth/userinfo.profile`.
6. On **Clients**, create a Web application OAuth client for each environment row. Nestra is one
   confidential Web application from Google's perspective because the hosted API owns the code
   exchange.
7. Add exactly one authorized redirect URI to each client from the URI inventory. Leave
   Authorized JavaScript origins empty.
8. Store each client ID and secret in the environment-specific password-manager record. Never
   download or commit a credential JSON file.

Google's Testing audience currently permits only explicitly listed test users and test grants can
expire after seven days. Confirm the current limits on the
[Google Auth Platform Audience page](https://support.google.com/cloud/answer/15549945) before a
private test window.

## Prepare the public production brand

Do not move the production project to In production until every item below is true.

1. Own the top private domain used by the API, app, homepage, and privacy policy.
2. Verify domain ownership in Google Search Console using an account that can manage the production
   Google Cloud project.
3. Add only that verified top private domain under Google Auth Platform Authorized domains.
4. Publish a static, public homepage on the verified domain. It must:
   - identify Nestra accurately;
   - describe its user-facing functionality;
   - explain that Google is used only to create or authenticate a Nestra account;
   - be visible without signing in;
   - link directly to the privacy policy;
   - avoid redirects to another domain.
5. Publish the privacy policy on the same verified domain. Its URL must be identical on the
   homepage and Branding page. The repository source is [`PRIVACY.md`](../../PRIVACY.md).
6. Publish a monitored support contact and use it as the Branding user support email.
7. Configure exact production callback and return hosts. A provider-owned `onrender.com` hostname
   is suitable for private deployment experiments but is not a substitute for the owned verified
   domain required for public Google OAuth readiness.
8. Review the Branding preview for the correct name, logo if supplied, homepage, privacy policy,
   and support email.
9. Confirm Data Access still contains only the three identity scopes.
10. Select **Publish app** so Audience shows In production.
11. Complete brand verification before public rollout. If Google classifies any configured scope
    as sensitive or restricted, stop and complete the additional verification shown by the
    console; do not add scopes merely to bypass or change the review path.

Google's current branding requirements are documented in
[Manage OAuth App Branding](https://support.google.com/cloud/answer/15549049) and
[App Homepage](https://support.google.com/cloud/answer/13807376). Changing a verified app's name,
logo, redirect URI, homepage, or privacy-policy link can require brand verification again.

## Mobile HTTPS association

Production Android and iOS return through the exact HTTPS mobile URI. Before creating production
native builds:

1. Serve Android Digital Asset Links at
   `https://app.<owned-domain>/.well-known/assetlinks.json` for package
   `com.michalrozek.nestra` and the production signing certificate.
2. Serve the Apple App Site Association file at
   `https://app.<owned-domain>/.well-known/apple-app-site-association` for the production team/app
   identifier and restrict it to `/oauth/google`.
3. Set `EXPO_PUBLIC_GOOGLE_AUTH_MOBILE_RETURN_URI` to the exact HTTPS URI before Expo native
   prebuild/build. The Expo config adds the Android verified intent filter and iOS associated
   domain only when Google authentication is enabled outside development.
4. Verify both association files over public HTTPS without authentication or redirects.

Development builds retain the private `com.michalrozek.nestra:/oauth/google` scheme. Expo Go is not
a supported OAuth target.

## Configure local development

1. Copy `apps/api/.env.example` to ignored `apps/api/.env` and copy
   `apps/client/.env.example` to the local client environment file used by Expo.
2. Select the test project's local-development OAuth client.
3. Set the client ID and client secret in `apps/api/.env`.
4. Generate an independent transaction key. This command writes the value only to the current
   terminal; transfer it directly to the ignored environment file or password manager:

   ```bash
   node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"
   ```

5. Keep the exact local callback and return defaults from the example file.
6. Set `GOOGLE_OAUTH_ENABLED=true` only after all API values exist.
7. Set `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true` in the matching client environment. Keep
   `EXPO_PUBLIC_GOOGLE_AUTH_MOBILE_RETURN_URI=com.michalrozek.nestra:/oauth/google`.
8. Start the stack and verify Web plus development native/desktop targets as needed. Never record
   a real authorization URL or callback.

The API refuses to start when enabled configuration is incomplete, the encryption key is not a
canonical base64 encoding of exactly 32 bytes, a path differs from the application contract, or an
environment uses a disallowed scheme.

## Configure private test and production on Render

Use separate Render services or environments and never share an environment group containing
Google credentials between test and production. Render environment variables protect credentials
from source control, but access to the Render dashboard remains privileged:
[Render environment variables and secrets](https://render.com/docs/configure-environment-variables).

Set the existing hosted API variables from [`hosted-api.md`](./hosted-api.md), then add:

Before enabling the group, remove development origins such as `http://localhost:8081` from the
production `CORS_ALLOWED_ORIGINS`. Use only the deployed HTTPS Web origin and the exact packaged
Tauri exception `http://tauri.localhost` when that client is served.

| Variable                                  | Secret? | Required value                                                 |
| ----------------------------------------- | ------- | -------------------------------------------------------------- |
| `GOOGLE_OAUTH_ENABLED`                    | no      | `false` while staging; `true` only for the complete deployment |
| `GOOGLE_OAUTH_CLIENT_ID`                  | no      | Matching environment's OAuth client ID                         |
| `GOOGLE_OAUTH_CLIENT_SECRET`              | yes     | Matching environment's OAuth client secret                     |
| `GOOGLE_OAUTH_CALLBACK_URI`               | no      | Exact HTTPS API callback from the URI inventory                |
| `GOOGLE_OAUTH_TRANSACTION_ENCRYPTION_KEY` | yes     | Independent canonical base64 key for exactly 32 random bytes   |
| `GOOGLE_OAUTH_WEB_RETURN_URI`             | no      | Exact HTTPS Web callback                                       |
| `GOOGLE_OAUTH_ANDROID_RETURN_URI`         | no      | Exact HTTPS Android App Link                                   |
| `GOOGLE_OAUTH_IOS_RETURN_URI`             | no      | Exact HTTPS iOS Universal Link                                 |
| `GOOGLE_OAUTH_DESKTOP_RETURN_URI`         | no      | `com.michalrozek.nestra.desktop:/oauth/google`                 |

Deployment sequence:

1. Keep both API and client Google flags false.
2. Add the complete API values with **Save only** or an equivalent no-deploy operation.
3. Add the owned custom API domain in Render, configure DNS, and wait for Render's HTTPS
   verification. Render automatically manages TLS for verified custom domains:
   [custom domains](https://render.com/docs/custom-domains).
4. Confirm the Google client contains exactly the same callback string.
5. Deploy the API with `GOOGLE_OAUTH_ENABLED=true`. A configuration error must stop startup before
   traffic is accepted.
6. Confirm the health endpoint is reachable; health does not prove Google provider behavior.
7. Build/deploy the matching client with both public Google variables and exact domain
   associations. Never enable an old client against a newly rotated API configuration.
8. Run the non-secret smoke checklist below.

## Smoke checklist

Record pass/fail and timestamp, never account email or credential-bearing URLs.

- Password sign-in remains available.
- A named test user can start Google sign-in and sees the expected project/app branding.
- Cancellation returns safely.
- New-account and returning-account flows complete.
- Existing-email collision requires explicit linking.
- Link flow requires the current password and matching Google email.
- Web history no longer contains the handoff after exchange.
- Android/iOS App or Universal Links open the installed build for warm and cold starts.
- Packaged Windows handles warm and cold protocol callbacks.
- Replaying a consumed handoff fails safely.
- API and client logs contain no callback query, codes, tokens, claims, email, or provider payload.

Integrated security and release verification remains tracked separately; this checklist validates
the deployed configuration, not every protocol behavior.

## Rotation

### Google OAuth client credentials

1. Schedule a short authentication maintenance window and hide the client action.
2. Set `GOOGLE_OAUTH_ENABLED=false` and deploy so no new transaction starts.
3. Wait at least the 10-minute provider transaction lifetime, or accept that in-flight users must
   retry.
4. Create a replacement OAuth client in the same environment-specific Google project with the same
   single exact redirect. Do not reuse a client from another environment.
5. Update the Render client ID and secret together, then deploy with the API flag enabled.
6. Smoke-test the replacement client before deleting the old OAuth client.
7. Delete the old client and remove its password-manager record after the rollback window closes.

### Transaction-encryption key

1. Disable new Google flows and let the 10-minute transaction lifetime drain.
2. Generate a new independent 32-byte base64 key and replace only the Render secret.
3. Redeploy and smoke-test. Existing Nestra sessions are unaffected; in-flight Google transactions
   created with the old key must restart.
4. Remove the old key after verification. The API intentionally has no dual-key mode.

## Rollback

- A code rollback uses Render's previous successful deploy. A dashboard rollback disables
  autodeploy until explicitly re-enabled:
  [Render rollbacks](https://render.com/docs/rollbacks).
- Treat code, API environment values, Google client configuration, client feature flags, custom
  domains, and native association files as one release set. Rolling back only one part can break
  the return path.
- Keep the previous Google OAuth client enabled until the replacement passes smoke testing. Restore
  its ID and secret from the password manager if configuration rollback is needed.
- Disable the client action first when behavior is uncertain. If the API configuration cannot be
  restored safely, leave `GOOGLE_OAUTH_ENABLED=false`; password authentication remains available.
- Never restore an encryption key or client secret from Git history, issue text, build logs, or
  screenshots.

## Incident revocation

1. Hide the Google action in every distributable client that can be changed immediately.
2. Set the affected API's `GOOGLE_OAUTH_ENABLED=false` and deploy.
3. Delete or disable the affected OAuth client in its Google project. Rotate the client and
   transaction key before re-enabling.
4. Review Google Cloud and Render access, remove unexpected principals, and rotate any other secret
   that might have shared the compromise path.
5. Inspect only redacted operational events for unexpected starts, callbacks, exchanges, or links.
6. Document the incident without credentials or user data.
7. Decide separately whether Nestra refresh sessions must be revoked. Disabling the Google client
   prevents new Google proofs but does not invalidate Nestra sessions already issued.

## Production promotion gate

Public promotion is blocked until every external prerequisite has evidence:

- separate test and production project identifiers;
- separate local, test, and production OAuth client identifiers;
- test project is External / Testing with reviewed named test users;
- production project is External / In production;
- owned domain verified in Search Console and authorized in Google Auth Platform;
- public homepage and matching privacy-policy link available without authentication;
- monitored support and developer contacts;
- production branding approved or its verification status explicitly accepted;
- only the three identity scopes configured;
- exact production callback and empty Authorized JavaScript origins;
- Render custom domain and HTTPS healthy;
- Android/iOS association files verified;
- secrets present only in the password manager and managed deployment configuration;
- smoke checklist complete.

Record evidence in this non-secret form:

```text
Environment: test | production
Google project ID: <non-secret identifier>
OAuth client ID suffix: <last 12 non-secret characters only>
Audience / publishing status: <value>
Brand verification status: <value>
Owned domain verified: yes/no
Homepage and privacy URLs checked: yes/no
Configured scopes: openid, email, profile
Authorized redirect checked exactly: yes/no
Authorized JavaScript origins empty: yes/no
Render configuration present without disclosed values: yes/no
Smoke checklist: pass/fail
Verified by / timestamp: <operator and UTC time>
```
