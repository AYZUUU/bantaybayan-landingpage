# BantayBayan Web Dashboard

## Configuration

Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_WEB_PUSH_PUBLIC_KEY`. Only public
keys belong in this browser application. Never put a Supabase
secret/service-role or VAPID private key in the dashboard.

The schema, migrations, and Edge Function deployment steps are documented in
the repository's [Supabase migration guide](../README.md#supabase-migration).
Admin sign-in, user management, incidents, reports, and settings use Supabase;
admin provisioning requires the deployed `manage-users` Edge Function.
Background browser notifications also require the deployed
`notify-report-event` function, the web push subscription migration, and
matching VAPID public/private keys. See the repository's Supabase migration
guide for configuration steps.

## Development and production build

```powershell
npm run dev
npm run build
```

The production build is written to `dist`.

## Pages

- `/` redirects to the administrator sign-in page.
- `/admin` is the administrator sign-in page; dashboard routes require an
  authenticated administrator session and MFA.

When deploying, configure the host to serve `index.html` for client-side routes
such as `/admin` and `/dashboard`.

## Admin dashboard deployment

The admin dashboard is a separate Vercel project with the project root set to
`web-app`. Use `npm run build` as the build command and `dist` as the output
directory. The included `vercel.json` provides the client-side route fallback.

The public landing page is a separate app in [`landing-site`](./landing-site/).
Deploy it as a different Vercel project; its setup and environment variables
are documented in that app's README.

## Map tiles

The dashboard defaults to OpenStreetMap tiles and includes required
attribution. The public OpenStreetMap tile server is intended for limited use,
not high-volume production. Before a production deployment, configure `VITE_OSM_TILE_URL` to
a tile provider whose terms and capacity fit the app, and set
`VITE_MAP_TILE_ATTRIBUTION` to that provider's required attribution. The tile
URL and attribution must belong to the same provider.

The admin dashboard includes locally bundled Ilocos Sur municipality
boundaries from geoBoundaries (NAMRIA, PSA, and OCHA Philippines; CC BY 3.0
IGO) for map highlighting.
