#Features

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
- ✅ VDOT Pacing Calculator: Daniels & Gilbert (1979) equations. Calculates VDOT from SB/PB/predicted time. Training paces (E/M/T/I/R zones) in both min/km and min/mile. Race time predictions for all standard events. VDOT panel in Records tab. Session creation pace hints. Coach can enter predicted SB with live VDOT preview.

## Session Editing

- **Coaches can edit sessions** they have created. Click "Edit" button in session detail modal or list card.
- Modal (`m-session`) is reused for both create and edit modes:
  - Create: title "NEW SESSION", athlete list shown, button "Create Session"
  - Edit: title "EDIT SESSION", athlete list hidden (single athlete only), button "Save Changes"
- Edit operates via `sb.from('sessions').update(payload).eq('id', editingSessionId).eq('coach_id', currentUser.id)`
- **RLS Requirement**: Must add UPDATE policy to `sessions` table:
  ```sql
  CREATE POLICY "sessions: coach update own"
  ON public.sessions FOR UPDATE
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());
  ```
- No re-notification on edits (coaches only; athletes already have the session in their view).

## VDOT System

- **Mathematical model**: Daniels & Gilbert (1979) regression equations — VO2 cost of running + biexponential sustainable fraction of VO2max.
- **Functions**: `vdotVO2(v)`, `vdotFraction(t)`, `calcVDOT(distance_m, time_seconds)`, `velocityFromVO2(vo2)`, `predictTime(vdot, distance_m)`, `vdotTrainingPaces(vdot)`, `bestVDOT(athletePBs)`.
- **Training zones**: Easy (59–74%), Marathon (75–84%), Threshold (83–88%), Interval (95–100%), Repetition (105–120%) — all as % of VO2max.
- **VDOT source priority (3-tier)**: (1) Season Bests across all events → highest VDOT; (2) PBs less than 1 year old → highest VDOT; (3) Predicted 5K time (fallback). Higher tiers take precedence.
- **`predicted_time`**: Nullable column on `personal_bests`. Used only on the `5km` row as the tier-3 fallback. Editable by both athlete and coach via Paces tab input.
- **UI**: Dedicated "Paces" tab in both coach & athlete views. VDOT hero panel + training paces grid + race predictions table. VDOT badge in all-athletes paces view. Pace hint in session creation modal mapped by session type to zone.
