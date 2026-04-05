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

## Session Types

`easy`, `tempo`, `intervals`, `long`, `recovery`, `race`, `strength`, `cross` — these appear in the sessions table, badge rendering, email templates, and the session type dropdown. Adding a new type requires updating all four locations.

## Standard Race Events

Races have an optional `event` field. Standard events include: `800m`, `1500m`, `3000m`, `5000m`, `10000m`, `5km`, `10km`, `5 miles`, `10 miles`, `Half Marathon`, `Marathon`. These auto-populate distance when selected in race modals and display in the Records view. Defined in `STANDARD_EVENTS` constant.

## Personal Bests & Season Bests (Records)

- Athletes can log PBs (lifetime best) and SBs (season best) for each event.
- PBs entered during registration (step 2) or anytime via profile Records tab.
- Race results auto-update PBs/SBs when logged as `completed` if time is faster.
- Coach view shows all athletes' PBs. Athlete view shows only their own. Both have a dedicated Records tab.
- `personal_bests` table: `athlete_id, event, distance_m, pb_time, pb_date, sb_time, sb_date, pb_race_id, sb_race_id`. Constraint: `UNIQUE(athlete_id, event)` enables upsert.
- Time parsing: `timeToSeconds(hh:mm:ss or mm:ss)` converts to seconds for comparison. `checkAndUpdatePB()` runs after race result logged.

## Athlete Self-Created Races

- Athletes can add their own races (not just coach-assigned).
- Self-created races store `coach_id = athlete_id` as a sentinel (since `coach_id` NOT NULL in schema).
- Coach visibility via RLS SELECT policy: `athlete_id IN (SELECT athlete_id FROM coach_athletes WHERE coach_id = auth.uid())`.
- Coach view displays "MY RACE" gold badge for athlete self-created, "COACH" red badge for coach-assigned.
- Coach's `loadRaces()` filters by `athlete_id IN (roster)` to cover both types.

## Athlete Unavailability

- Athletes mark date ranges when they're unavailable (illness, holiday, travel, etc.).
- Stored in `unavailability` table: `athlete_id, start_date, end_date, reason, created_at`.
- RLS: Athlete has full CRUD on their own rows; coaches can SELECT for their roster athletes.
- Coach warning: When creating a session on a blocked date, a confirm dialog shows athlete names.
- Athlete view: Unavailability periods listed in Records tab with edit/delete; buttons "+ Mark Unavailable" in main view.
- Week view: Red banner displayed on each unavailable day.

## Athlete Self-Logged Extra Sessions

- Athletes log sessions they completed outside the coach plan (parkrun, strength work, etc.).
- Stored in `sessions` table with `coach_id = athlete_id` and `is_extra = true` sentinel.
- Reuses existing `loadAthleteSessions()` — no new table or load function needed.
- Week/list view: Extra sessions tagged with purple "EXTRA" badge.
- Week card styling: Purple left border and background.
- Athletes can log via "+ Log Session" button in main view.

## Training Groups

- Coach creates named groups (name, colour, emoji) via "+ New Group" in sidebar footer.
- Athletes can be in multiple groups. Groups show in sidebar as collapsible sections with colour dot.
- `training_groups`: `coach_id, name, colour, emoji`. `group_members`: `group_id, athlete_id, joined_at, muted_at, left_at`.
- `left_at` soft-delete: leaver's posts invisible until re-added. `muted_at`: muted peer posts, coach messages still arrive.
- `selectGroup(id)` filters the main view to that group's athletes (sets `selectedGroupId`).
- Coach manages members via ⚙ icon → `m-group-members` modal (add/remove). Edit group via ✎ icon.
- Athlete mute/leave controls in Feed view group settings section.

## Activity Feed

- New "Feed" view tab in both coach and athlete views.
- `feed_posts`: `author_id, post_type, content, target_type ('all'|'group'|'athlete'), target_id, metadata (jsonb)`.
- `feed_reactions`: `post_id, user_id, emoji`. UNIQUE `(post_id, user_id, emoji)` — toggle on/off.
- Post types: `announcement`, `message`, `auto_pb`, `auto_sb`, `auto_session`, `auto_race`, `auto_left`.
- **Auto-posts** (athlete-triggered): PB → `auto_pb`, SB → `auto_sb`, session 4–5★ → `auto_session`, race completed → `auto_race`. Posted to all athlete's groups, or `target_type='all'` if no groups.
- **Feed visibility**: Coach sees all posts for their roster/groups. Athletes see: own posts + `target_type='all'` + posts to their groups (filtered: author must still be active member via `left_at IS NULL`).
- Tab strip: "All" + one tab per group. Compose box targets all/group/private athlete.
- Emoji reactions: 👏 🔥 💪 🎉 — shown as counts, click to toggle own reaction.
- `autoPost(type, content, targetType, targetId, metadata)` helper called from hooks.
- State: `groups[]`, `groupMembers[]`, `feedPosts[]`, `feedReactions{}` (keyed by post_id). `feedTab` (current tab).

## Recent Completions (This Session)

- ✅ Athlete self-created races: Athletes add own races; stored with `coach_id = athlete_id`. Coach visibility via RLS & loadRaces() refactor.
- ✅ Unit toggle (km/miles): Persistent in localStorage. Affects all distances, paces, form inputs, chart labels.
- ✅ Lightning McQueen theme: Racing Red (#DC2626), Lightning Gold (#FFD700), dark asphalt backgrounds, "95" badge on logo.
- ✅ Audio on auth: Ka-chow sound plays on sign-in, stops on sign-out.
- ✅ PB/SB Records: `personal_bests` table. Athletes enter on registration (step 2) or anytime. Auto-update on race completion.
- ✅ Standard events: 11 distances (800m–Marathon) auto-fill race distance, appear in Records view.
- ✅ Records tab: Both coach & athlete views. Athlete registration flows to step 2 PB entry.
- ✅ Athlete unavailability: Date range marking, coach warning on session create, week view red banner, Records tab management.
- ✅ Athlete self-logged extra sessions: Log sessions outside coach plan, purple "EXTRA" badge, stored as `coach_id = athlete_id, is_extra = true`.
- ✅ Training Groups: Coach creates groups with colour/emoji. Sidebar restructured with collapsible group sections. Athletes mute/leave groups. Soft-delete via `left_at`.
- ✅ Activity Feed: Auto-posts on PB/SB/race/session. Coach announcements. Emoji reactions (👏🔥💪🎉). Per-group tab filtering. History hidden when athlete leaves (not deleted).

## Current Focus / Known Issues

- The app has no edit-session flow yet — coaches can only create, duplicate, or delete sessions.
- No password reset flow implemented.
- Profile page for editing PBs: Currently editable only from Records tab. A dedicated settings page is a future enhancement.
- Pending test: Verify unavailability, extra sessions, and PB auto-updates work end-to-end in production (curious-dieffenbachia-b81623.netlify.app).