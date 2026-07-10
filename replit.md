# Potluck

A collaborative potluck/event table app built with React, Vite, TypeScript, Tailwind CSS, and Supabase.

## Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Framer Motion
- **Backend/Auth/DB**: Supabase
- **Icons**: Lucide React

## Running the app
1. Create a Supabase project and run the migrations in `supabase/migrations/`.
2. Set the following environment secrets:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon/public key
3. Install dependencies: `npm install`
4. Start dev server: `npm run dev`

## Project structure
- `src/components/` — UI components (auth, dashboard, sidebar, modals)
- `src/lib/` — Supabase client, auth context, hooks, toast, UI primitives
- `src/app/api/` — API helpers
- `supabase/migrations/` — Database schema migrations

## User preferences
