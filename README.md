Right now, our Superadmin module focuses on core multi-tenant user provisioning (managing Admins, Responders, and Citizens) and global system telemetry like report resolution rates.

## Expo development runtime

The app uses Expo SDK 58. Use a supported Node.js release: `^22.13.0`,
`^24.3.0`, or `^26.0.0` (Node 27+ is also accepted). In particular, Node 25 is
not supported by this SDK. The repository's `.nvmrc` selects Node 24.3.0.

## Production builds

Before creating a mobile build, add `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the EAS `production` environment.
Configure Android and iOS signing credentials in the linked EAS project as
needed. The production profile creates store-distribution builds and
auto-increments the app build number:

```powershell
eas build --profile production --platform android
eas build --profile production --platform ios
```

For the admin dashboard, set its `VITE_*` variables in the hosting provider,
then run these commands from `web-app` and publish `dist` as a static site:

```powershell
npm ci
npm run build
```

Configure the static host to serve `index.html` for client-side routes, enable
HTTPS, and use a production map-tile provider appropriate for the expected
traffic. Complete the Supabase migration, Edge Function, and notification
configuration steps below before releasing.

### Local Android release build

To build an APK without EAS, use Node 24 (see `.nvmrc`), JDK 17 and the Android
SDK. Create `.env.local` with the `EXPO_PUBLIC_*` values from `.env.example`
(they are inlined at build time), then run:

```powershell
npx expo prebuild --platform android
cd android
.\gradlew.bat :app:assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a
```

The APK is written to `android\app\build\outputs\apk\release\`. The generated
`android` folder is gitignored and `prebuild` signs with the debug keystore. To
sign with your own key, create a keystore outside the repository (`*.jks` is
ignored), keep a backup of it and its password, and define these properties in
`~/.gradle/gradle.properties`: `BANTAYBAYAN_UPLOAD_STORE_FILE`,
`BANTAYBAYAN_UPLOAD_STORE_PASSWORD`, `BANTAYBAYAN_UPLOAD_KEY_ALIAS` and
`BANTAYBAYAN_UPLOAD_KEY_PASSWORD`. Then make the `release` signing config in
`android\app\build.gradle` read them (re-apply this if you regenerate the folder
with `prebuild --clean`). On Windows, CMake 3.22 can fail on the
`react-native-worklets` native step with "build.ninja still dirty"; set
`cmake.dir` in `android\local.properties` to a CMake 3.31+ install.
The Expo build-properties configuration in `app.json` preserves the
WorkManager database constructor needed by minified release builds.
On Android, the location picker and responder map use OpenStreetMap tiles via
Leaflet and do not require a Google Maps API key. Tiles need an internet
connection; configure `EXPO_PUBLIC_OSM_TILE_URL` for the tile provider when
needed, and comply with its usage and attribution requirements.

### Responder location sharing

Apply `202611100011_responder_live_location.sql` to Supabase before enabling
responder tracking. An assigned responder must explicitly enable sharing and
grant foreground and background location permissions. Their position is shared
only with the report's citizen while the response is en route. New responses
require another confirmation; the location is removed
when the report is resolved, reassigned, or sharing stops successfully. If
server cleanup fails, the last position expires after two minutes. Anonymous
reports cannot view a responder.
Android shows a persistent notification while sharing. Device power management,
lost connectivity, revoked permissions, or terminating the app can interrupt
updates; the map must not be relied on as a guaranteed live position.
Rebuild the mobile app after changing location permissions; existing generated
native projects must also include the Expo location plugin's permissions.
Background location is not supported in Expo Go; use a development or release
build to test it on a physical device.

### SMS fallback for citizens without internet

When a report fails to send, the app offers a "Send by SMS" button that opens
the phone's messages with a prefilled text addressed to the hotline number. The
number is read from the `hotline_number` row of the `app_settings` table (edit
it in the Supabase table editor, or as a superadmin) and cached on the phone so
it works offline; `EXPO_PUBLIC_HOTLINE_NUMBER` is the fallback when the row is
empty (leave both empty to hide the button).

The `receive-sms-report` Edge Function turns texts sent to that hotline into
dashboard reports. Deploy it with JWT verification disabled and set the
`SMS_WEBHOOK_SECRET` secret, then have an SMS gateway or forwarder (for example
an Android SMS-forwarder app or an iOS Shortcuts "Message" automation) POST each
incoming text as JSON `{"from": "<sender>", "message": "<text>"}` (Globe Labs
inbound JSON is also accepted) to
`https://<project>.supabase.co/functions/v1/receive-sms-report?token=<secret>`.
Texts in the app's format (`BANTAYBAYAN EMERGENCY: <type> (<level>). Location:
<lat>,<lon>`) become located reports; any other text becomes an "SMS Report"
with no coordinates for staff to call back. Senders are limited to 5 reports
per hour.

## Supabase migration

Supabase client configuration is read from local, untracked environment files:

- Expo: copy `.env.example` to `.env.local` and set
  `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Web dashboard: copy `web-app/.env.example` to `web-app/.env.local` and set
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and
  `VITE_WEB_PUSH_PUBLIC_KEY`.

Only the publishable key belongs in client applications. Never use a Supabase
secret/service-role key in the Expo app or web dashboard.

The initial schema and row-level security policies are in
`supabase/migrations/202611100001_initial_schema.sql`; it has been applied to the
Supabase project. The recovered accounts and reports have also been imported
and verified (11 profiles and 80 reports). Mobile and web authentication,
reporting, profile, responder, and administration workflows now use Supabase.
Registration and privileged account management use the server-side Edge
Functions in `supabase/functions`; the service-role key is never included in
either client.

Before release, verify that migrations
`202611100001_initial_schema.sql` through
`202611100011_responder_live_location.sql` have been applied to the production
Supabase project in order. Apply only migrations that are not already present;
do not rerun migrations blindly. These migrations cover the initial schema,
responder claims, avatar cleanup, query indexes, web push/email and admin AAL2,
anonymous Quick Reports, responder backup requests, report contact-number
backfill and insert hardening, hotline settings, and responder live location.
Then deploy the Edge Functions from a linked Supabase project:

```powershell
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy register-user
supabase functions deploy manage-users
supabase functions deploy notify-report-event
supabase functions deploy submit-quick-report
supabase functions deploy receive-sms-report
```

`register-user` is intentionally public so prospective users can submit a
registration. It creates the Auth user as email-confirmed (no verification email
is sent) and leaves the profile pending administrator approval, matching the
existing registration workflow; it validates the submission and stores ID
images in the private `id-photos` bucket.
`manage-users` requires an authenticated administrator. Supabase provides the
functions' server-side environment keys; never put a secret/service-role key
in a client environment file or source code.

The mobile app's Quick Report is available without signing in. Guest alerts
are submitted anonymously with GPS coordinates, are limited to five per
network address per hour, and cannot be tracked from the app afterward. Apply
`202611100006_anonymous_quick_reports.sql` and deploy the
`submit-quick-report` Edge Function before enabling this flow. The function
uses the service role only on the server and notifies responders through
`notify-report-event`.

### Push notification configuration

Browser push requires HTTPS (localhost is allowed for development), a VAPID key
pair, and the same public key in `web-app/.env.local` as the server's
`VAPID_PUBLIC_KEY`. Generate a VAPID key pair with
`npx --yes web-push generate-vapid-keys`, then configure the public key for the
web build and the private values as Supabase function secrets:

```powershell
supabase secrets set VAPID_PUBLIC_KEY=<public-key> VAPID_PRIVATE_KEY=<private-key> VAPID_SUBJECT=mailto:admin@example.com
```

Rebuild/redeploy the web dashboard after setting `VITE_WEB_PUSH_PUBLIC_KEY`.
New citizen and responder registrations send a background browser notification
to active superadmins who enabled push notifications. Report and account
approval alerts open the relevant report or account; if the alert cannot
identify the record, the account review queue is shown instead. Notification
sound depends on browser and operating-system
notification settings. Deploy both `register-user` and `notify-report-event`
when updating this workflow. Notification delivery errors are logged without
undoing a successful registration.
Mobile push uses Expo Push Service; configure the Android FCM credentials in
the EAS project before expecting Android delivery. `EXPO_ACCESS_TOKEN` may be
set as a Supabase secret to authenticate Expo push requests.

### Authenticator app and email changes

Enable TOTP in the Supabase project's Authentication > MFA settings. Admins
must enroll and verify an authenticator before the dashboard grants access;
mobile users can enable TOTP under Settings. Email changes use Supabase's
configured email confirmation flow; update the project's email templates and
redirect allow-list for the deployed app URLs.

Do not disable XAMPP until all required migrations and functions are verified
on the production project and signup, user administration, reports, and private
image access have been tested against it. Client `.env.local` files need only
the project URL and publishable key described above.

The current MySQL database contains `users` and `reports` (no `admins` table).
PHP creates password hashes with `password_hash()`; compatible bcrypt hashes
can be imported through Supabase Auth's admin API, preserving those passwords.
The migration maps legacy numeric account and report IDs to Supabase UUIDs while
preserving report assignments. Keep the API `uploads` directory available for
media migration. Treat exports as sensitive data: keep them outside Git and do
not paste them into chat.

A recovery copy and JSONL export are available locally at
`C:\xampp\mysql\data_recovery_copy_20261110\migration-export`; the export
passed the local dry run. A subsequent recovery attempt also wrote to the
original `C:\xampp\mysql\data` directory. The recovery server is stopped.
Do not start XAMPP or modify either data directory while continuing from the
export. Validate the export without network access using:

```powershell
node scripts/migrate-xampp-to-supabase.mjs --dry-run
```

The SQL and data import are complete; do not rerun the importer as part of
normal app startup. It required a Supabase secret/service-role key, which must
remain local and must never be placed in client `.env` files or source control.
One legacy account had no password hash and is marked as requiring a password
reset; its reset flow has not been implemented in the app yet.