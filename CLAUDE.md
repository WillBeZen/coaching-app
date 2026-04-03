# PaceCoach

Free coaching platform for runners. Single-file static HTML app backed by Supabase (auth, database, edge functions) with optional Resend email notifications.

## Architecture

- **Frontend**: Single `index.html` — all HTML, CSS, and JS in one file. No build step. Hosted on any static host (Netlify, Azure SWA, GitHub Pages).
- **Database**: Supabase PostgreSQL with Row Level Security. Five tables: `profiles`, `coach_athletes`, `sessions`, `session_logs`, `races`.
- **Auth**: Supabase Auth (email/password). Email confirmation is disabled — signUp followed by immediate signInWithPassword.
- **Email**: Optional Supabase Edge Function (`notify-athlete`) calling Resend API. Silently skipped if not deployed.
- **Charts**: Chart.js loaded from CDN. No npm dependencies in the frontend.

## Files

- `index.html` — The entire app. Coach view (sidebar + main), athlete view (single column), auth screen, all modals, all JS logic.
- `schema.sql` — Run once in Supabase SQL Editor. Creates all tables + RLS policies.
- `notify-athlete.ts` — Deno edge function deployed to Supabase. Sends branded HTML email via Resend.
- `PaceCoach_Setup_Guide.docx` — Non-technical setup guide for coaches.

## Key Patterns

- **Rendering**: Full innerHTML replacement on every state change via `renderApp()` → `renderCoachView()` / `renderAthleteView()`. No virtual DOM. All event handlers use inline `onclick` attributes in template literals.
- **Modals**: Defined as static HTML outside `#app` div so they survive re-renders. Modal state managed via `.open` CSS class on `.modal-overlay`.
- **Data flow**: Load functions (`loadCoachSessions`, `loadAthleteSessions`, `loadRaces`, `loadLogs`) fetch from Supabase, populate module-level arrays/objects (`sessions`, `logs`, `races`, `athletes`), then `renderApp()` rebuilds the DOM.
- **Chart lifecycle**: `chartInstances` object tracks Chart.js instances. `destroyCharts()` must be called before any re-render to prevent canvas memory leaks.

## Supabase RLS

- `for all using (...)` does NOT cover INSERT — it only covers SELECT, UPDATE, DELETE.
- INSERT policies require `for insert with check (...)` as a separate policy.
- Every table needs explicit INSERT policy or writes will silently fail (spinner hangs, no error shown to user).

## Known Gotchas

- Supabase email confirmation must be disabled (Authentication → Providers → Email → toggle off "Confirm email"), otherwise registration silently fails.
- `npm install -g supabase` is unsupported. Use Homebrew (Mac), Scoop (Windows), or local npm install.
- Edge function deploy needs `--no-verify-jwt --use-api` flags.
- Date strings are always handled as `YYYY-MM-DD` with `+ 'T00:00:00'` appended when creating Date objects to avoid timezone offset issues.
- `getMonday()` treats weeks as Mon–Sun (ISO style), not Sun–Sat.

## Coding Conventions

- No framework, no build tools, no package.json for the frontend. Everything is vanilla JS in a single file.
- CSS custom properties defined in `:root` — all colours, fonts, radii referenced via `var(--token)`.
- Font stack: Bebas Neue (display/headings), Space Mono (data/monospace), DM Sans (body).
- Accent colour is `#F97316` (orange). Success is `#10B981` (green). Danger is `#EF4444` (red).
- Functions use `const el = id => document.getElementById(id)` and `const val = id => el(id).value.trim()` shorthand throughout.
- Supabase client is `sb`. Current user state: `currentUser` (auth), `currentProfile` (profiles table row).

## Session Types

`easy`, `tempo`, `intervals`, `long`, `recovery`, `race`, `strength`, `cross` — these appear in the sessions table, badge rendering, email templates, and the session type dropdown. Adding a new type requires updating all four locations.

## Current Focus

- Debugging: After a coach creates a session or race, subsequent creates require a sign-out/sign-in cycle. Likely an unhandled promise rejection in a load function killing the render cycle. Check browser console for the error after any create action.
- The app has no edit-session flow yet — coaches can only create, duplicate, or delete sessions.
- No password reset flow implemented.