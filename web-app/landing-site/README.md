# BantayBayan Public Landing Page

This is the public website, deployed independently from the admin dashboard.
It does not include the dashboard or its Supabase client.

## Local development

```powershell
npm install
npm run dev
```

## Deploy to Vercel

Create a separate Vercel project for this repository and set its Root Directory
to `web-app/landing-site`. Use `npm run build` as the build command and `dist`
as the output directory.

Set `VITE_ADMIN_URL` to the public base URL of the separate admin website. The
landing page hides admin portal links when this value is not set. This variable
is a public URL, not a credential.
