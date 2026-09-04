# React + Vite

## Supabase persistence

The app keeps an offline localStorage copy and syncs the signed-in user record to Supabase whenever `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured. Supabase Auth provides persistent multi-device sessions and automatic access-token refresh. The remote payload includes entries, workouts, routines, fasting, meditation, metrics, and profile preferences; passwords are never included.

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
2. Copy `.env.example` to `.env` and set the project URL and anon key.
3. Add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` variables to the Cloudflare Pages build environment, then redeploy.
4. In Supabase Authentication, configure the email confirmation and redirect URL for the deployed site.

Each profile row uses server-authoritative last-write-wins synchronization: a device reads the current row before saving, and a newer `updated_at` row replaces an offline local edit. Realtime updates apply changes while multiple devices are open. The Settings page can invalidate refresh tokens globally with “Sign out everywhere”; the next request on every other device must authenticate again.

The Vite client uses Supabase's persistent browser session storage so a user can return to an active session. Browser-only SPAs cannot set HTTP-only cookies; deployments that require that stronger token boundary should put Supabase Auth behind a server-rendered or edge session exchange and set secure, HTTP-only cookies there. The unconfigured local preview is a demo fallback and is not an account system for production.

The Export buttons download JSON with all saved collections or a CSV containing entries, workouts, routines, meditation notes, and fasting data. When the two `VITE_SUPABASE_*` variables are present, the login and registration forms use Supabase Auth exclusively; the local email/password flow is available only as an offline demo fallback when Supabase is not configured. Do not deploy with placeholder variables if production authentication is required.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
