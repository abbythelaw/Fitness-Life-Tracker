# React + Vite

## Supabase persistence

The app keeps an offline localStorage copy and syncs the signed-in user record to Supabase whenever `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured. The remote payload includes entries, workouts, routines, fasting, meditation, metrics, and profile preferences; the local password is excluded.

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
2. Copy `.env.example` to `.env` and set the project URL and anon key.
3. Add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` variables to the Cloudflare Pages build environment, then redeploy.

The Export buttons download JSON with all saved collections or a CSV containing entries, workouts, routines, meditation notes, and fasting data. The schema currently assumes the app is paired with Supabase Auth; for production use, replace the local email/password login with Supabase Auth before enabling public deployment.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
