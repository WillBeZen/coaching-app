# PaceCoach

Free coaching platform for runners. Single-file static HTML app backed by Supabase (auth, database, edge functions) with optional Resend email notifications.

## Architecture

- **Frontend**: Single `index.html` — all HTML, CSS, and JS in one file. No build step. Hosted on any static host (Netlify, Azure SWA, GitHub Pages).
- **Database**: Supabase PostgreSQL with Row Level Security. Eleven tables: `profiles`, `coach_athletes`, `sessions`, `session_logs`, `races`, `personal_bests`, `unavailability`, `training_groups`, `group_members`, `feed_posts`, `feed_reactions`.
- **Auth**: Supabase Auth (email/password). Email confirmation is disabled — signUp followed by immediate signInWithPassword.
- **Email**: Optional Supabase Edge Function (`notify-athlete`) calling Resend API. Silently skipped if not deployed.
- **Charts**: Chart.js loaded from CDN. No npm dependencies in the frontend.
- **Theme**: Lightning McQueen inspired (dark asphalt, Racing Red `#DC2626`, Lightning Gold `#FFD700`).
- **Audio**: Ka-chow sound plays on sign-in, pauses on sign-out.

## Files

- `index.html` — The entire app. Coach view (sidebar + main), athlete view (single column), auth screen, all modals, all JS logic.
- `schema.sql` — Run once in Supabase SQL Editor. Creates all tables + RLS policies.
- `notify-athlete.ts` — Deno edge function deployed to Supabase. Sends branded HTML email via Resend.
- `PaceCoach_Setup_Guide.docx` — Non-technical setup guide for coaches.
- `Features.md` — File to show features in the current app.

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
- **McQueen theme colours**: Accent is `#DC2626` (Racing Red), Gold is `#FFD700` (Lightning), Success is `#10B981` (green), Danger is `#EF4444` (red). Backgrounds use dark asphalt (`#0C0C10`, `#18181F`, `#222230`).
- Functions use `const el = id => document.getElementById(id)` and `const val = id => el(id).value.trim()` shorthand throughout.
- Supabase client is `sb`. Current user state: `currentUser` (auth), `currentProfile` (profiles table row).
- Unit system: `usesMiles` (localStorage) controls all distance/pace displays. Helper functions: `displayDist(km)`, `distUnit()`, `paceUnit()`, `toggleUnits()`. Conversion: `KM_TO_MI = 0.621371`.

## Current Focus / Known Issues

- No password reset flow implemented.
- Profile page for editing PBs: Currently editable only from Records tab. A dedicated settings page is a future enhancement.
- Pending test: Verify unavailability, extra sessions, and PB auto-updates work end-to-end in production (curious-dieffenbachia-b81623.netlify.app).
