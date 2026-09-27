# DoIt App Handoff

Last reviewed: 2026-09-27 (latest commit `a70d25a`, 2026-05-26)

This document is a plain-English handoff for another ChatGPT session or developer who needs to understand this codebase without reading every file first.

## Start Here: Current Status (2026-09-27)

- **The app works.** `npm run build` passes, `npm run dev` serves the app, and the Supabase project is reachable (auth plus the `tasks`, `activities` and `activity_sessions` tables all respond).
- **It is live.** It is deployed on Vercel and the owner uses it daily on an iPhone as a home-screen web app.
- **Deploys happen automatically.** GitHub repo: `nwabuokumich-debug/doit-app`. Every push to `main` auto-deploys to Vercel. There is no staging environment, so anything pushed to `main` goes straight to the owner's phone.
- **Local and GitHub are in sync.** Local `main` equals `origin/main`. The only uncommitted files are `.claude/settings.local.json` (Claude Code tool permissions, not app code) and this `HANDOFF.md`.
- **The live database is ahead of the schema file.** The production Supabase `tasks` table has `has_time_deadline` and accepts the seven class priorities. `supabase-schema.sql` in the repo does not. See Known Issue 1.
- **The design changed recently.** In May 2026 the app was restyled from a dark theme to a light "sticker" design, and task completion got a large confetti/haptics celebration. See "Recent Changes" and "Styling" below. Keep new UI consistent with the sticker system.
- **Nothing is in progress.** No work is half-finished, and there are no open branches.

## Recent Changes (2026-05-25 → 2026-05-26)

Newest first:

| Commit | What changed |
| --- | --- |
| `a70d25a` | The task completion control is now a real `<input type="checkbox" switch>` (in `TaskItem.jsx`). On iOS 18+ Safari, tapping a native switch fires the Taptic Engine, which is the only way to get haptics on iPhone web (`navigator.vibrate` does nothing on iOS). The `switch` attribute is spread as `{...{ switch: '' }}` so React passes it through. The input is `appearance-none` and styled as a sticker box, with a `Check` icon overlaid using `pointer-events-none`. **Do not replace this with a `<button>`, or iPhone haptics will stop working.** |
| `a82b638` | The celebration moved out of `TaskItem` into a global `CelebrationRoot` (`src/components/CelebrationRoot.jsx`, mounted in `App.jsx`). `TaskItem` now calls `emitCelebration(payload)` from `src/lib/celebrate.js`, a tiny pub/sub. Reason: on Today, completing a task moves it from the pending list to the completed list, which unmounted `TaskItem` mid-animation and cut the confetti off. |
| `e50c035` | Much bigger completion feedback. Confetti is portaled to `document.body` and scales with task points (16/28/44 pieces). Combo escalation: ×3+ adds a mustard screen-edge flash, ×5+ adds a second confetti wave, ×10+ shows a giant "×N COMBO!" splash. The Today score card pops. Milestone splashes appear on Today: PERFECT (100%), BONUS (over 100%) and DAY DONE (last task). Android also gets `navigator.vibrate` patterns. |
| `802fa12` | All Tasks now hides tasks from past days. Anything dated before today is filtered out, so the old "Overdue" bucket effectively only holds earlier-today timed tasks. Past days are viewed through Today's day navigation and calendar. |
| `98f8436` | New Today header styling and the first version of the completion celebration. |
| `34c9679` | Modal z-index raised above the floating bottom nav. |
| `20e905b` | Full restyle to the "sticker" design system (see Styling). |

## Product Summary

DoIt is a mobile-first productivity tracker. It started as a to-do list, but it now behaves more like a gamified day planner plus time tracker.

The app lets a signed-in user:

- Create tasks for specific dates.
- Optionally add a time deadline to a task.
- Assign each task a difficulty/class level.
- Earn points when tasks are completed.
- Lose points for missed tasks after their due date has passed.
- Earn deadline bonuses for completing timed tasks on time.
- Take deadline penalties for completing timed tasks late.
- Build short combo streaks by completing tasks close together.
- View daily task lists, historical days, analytics, and all tasks.
- Track time spent on named activities such as Writing, Reading, Work, Exercise, etc.
- Analyze activity time as rings, a donut breakdown, horizontal bars, and daily stats.

The app is built as a single-page React app with Supabase for authentication, database storage, and realtime sync.

## Tech Stack

- Frontend: React 19 with Vite.
- Styling: Tailwind CSS v4 using utility classes and a custom dark theme in `src/index.css`.
- Icons: `lucide-react`.
- Dates: `date-fns`.
- Charts: mostly custom SVG/chart UI, with `recharts` installed but not currently used in the visible source.
- Backend/data: Supabase Auth and Supabase Postgres.
- Realtime: Supabase realtime channels for tasks, activities, and activity sessions.
- Notifications: Browser Notifications API in the profile page, plus OneSignal setup in `index.html`, `public/OneSignalSDKWorker.js`, and `api/notify.js`.

## How The App Is Structured

The app entry point is `src/main.jsx`, which renders `src/App.jsx`.

`App.jsx` is the main shell:

- It checks authentication with `useAuth`.
- If auth is loading, it shows a spinner.
- If there is no signed-in user, it shows the auth screen.
- If the user is signed in, it shows a fixed mobile-width app shell with a bottom navigation bar.
- It keeps the active tab in local state.
- It keeps the selected day for the Today screen in local state.

The bottom tabs are:

- `Today`: daily task planning and scoring.
- `Tasks`: searchable list of all tasks.
- `Activity`: time tracking and activity analytics.
- `Analytics`: task score analytics.
- `Profile`: user profile, all-time stats, notifications, and sign out.

There is no route-based navigation even though `react-router-dom` is installed. Tab switching is local React state.

## Data Model

The intended Supabase tables are:

- `tasks`
- `activities`
- `activity_sessions`

The SQL schema file is `supabase-schema.sql`.

### Tasks

Tasks represent planned actions. In the frontend, a task may have:

- `id`
- `user_id`
- `title`
- `description`
- `due_at`
- `priority`
- `points`
- `bonus_points`
- `completed`
- `completed_at`
- `created_at`
- `has_time_deadline`

Important note: the frontend uses `has_time_deadline`, but the current `supabase-schema.sql` does not define this column. The frontend also uses priority values like `light`, `basic`, `normal`, `solid`, `major`, `grand`, and `epic`, but the SQL schema currently restricts `priority` to `low`, `medium`, and `high`. The **production** database was already migrated by hand (verified 2026-09-27: `has_time_deadline` exists). Only a **fresh** database built from the checked-in schema would break task creation.

There is no `notes` column. Task notes (`NoteModal`) are stored in `description`.

### Activities

Activities are named categories for time tracking. Each activity has:

- `id`
- `user_id`
- `name`
- `color`
- `created_at`

### Activity Sessions

Activity sessions store time intervals. Each session has:

- `id`
- `activity_id`
- `user_id`
- `started_at`
- `ended_at`

If `ended_at` is null, the session is still active.

## Authentication

Authentication is handled by `src/hooks/useAuth.js`.

It uses Supabase Auth:

- `signUp(email, password)`
- `signIn(email, password)`
- `signOut()`
- `getSession()` on startup
- `onAuthStateChange()` to keep the UI in sync

The unauthenticated screen is `src/components/Auth.jsx`.

The auth screen is branded as "DoIt" with the tagline:

> Track tasks. Earn points. Win days.

Sign-up may require email confirmation depending on the Supabase project settings.

## Task Scoring System

The scoring system is centered around `src/lib/levels.js` and `src/hooks/useTasks.js`.

Task classes are:

| Class | Points | Missed Deduction | On-Time Bonus | Late Penalty |
| --- | ---: | ---: | ---: | ---: |
| Light | 1 | 1 | 1 | 0 |
| Basic | 2 | 1 | 1 | -1 |
| Normal | 4 | 2 | 1 | -2 |
| Solid | 7 | 4 | 2 | -3 |
| Major | 10 | 6 | 3 | -3 |
| Grand | 14 | 9 | 4 | -3 |
| Epic | 20 | 12 | 5 | -2 |

`earnedPoints(task)` works like this:

- If the task is not completed, it earns 0.
- Start with the task's base points.
- Add combo bonus points stored in `bonus_points`.
- If the task has a time deadline and was completed before or at `due_at`, add the class time bonus.
- If the task has a time deadline and was completed after `due_at`, add the class time penalty.
- The final earned score cannot go below 0.

`missedPoints(task)` works like this:

- If the task is completed, there is no missed deduction.
- If the task has no due date, there is no missed deduction.
- If the due date is still in the future, there is no missed deduction.
- If the due date has passed and the task is not completed, deduct the class deduction.

Daily score returns:

- `earned`
- `deducted`
- `possible`
- `tasks`

The Today screen displays net earned score as:

`max(0, earned - deducted)`

## Combo System

The combo system lives mostly inside `src/pages/Today.jsx`.

The goal is to reward a user for completing tasks close together.

The combo window depends on the previous completed task's points:

- Heavy tasks, 10 or more points: 2 hour window.
- Medium tasks, 4 to 9 points: 45 minute window.
- Light tasks, below 4 points: 5 minute window.

The combo bonus depends on how quickly the next task is completed:

- For heavy tasks, the factor is 50%, 30%, or 15% depending on timing.
- For medium tasks, the factor is 30% or 15%.
- For light tasks, the bonus is a flat 1 point within 5 minutes.
- Longer chains can add extra chain bonus points.

The active combo appears as a banner on the Today screen with:

- Streak count.
- Countdown until the combo expires.
- Fading visual state as the timer runs down.

When a completed task is uncompleted, the Today screen tries to recalculate the bonus for the task that came after it in the completion chain.

## Main Screens

### Today Screen

File: `src/pages/Today.jsx`

This is the core daily workflow.

The screen shows:

- Month label.
- Calendar button.
- Previous/next day buttons.
- Human-friendly day label such as Today, Tomorrow, Yesterday, or weekday/date.
- Week strip with tiny score dots.
- Optional combo banner.
- Daily score bar.
- Collapse button for hiding the score/header section.
- Toggle between task list and timeline.

Task list behavior:

- Future and current days allow adding and completing tasks.
- Past days are sealed: tasks are shown but locked.
- Pending and completed tasks are separated.
- Tasks are sorted by point value, highest first.
- Empty states explain when no tasks exist.

Add button:

- A floating plus button appears only for non-past days and only in the task-list view.

Timeline behavior:

- The timeline shows completed tasks by their completion time.
- It has a 24-hour vertical grid.
- It scrolls to the current time for today, or around 8am for other days.
- Completed task blocks can be dragged vertically to adjust `completed_at`.

### All Tasks Screen

File: `src/pages/AllTasks.jsx`

This is a global task browser.

It provides:

- Search by task title.
- Filter tabs: all, pending, done.
- Grouping by date bucket:
  - Overdue
  - Today
  - Tomorrow
  - Future dates
  - No Date
- Add Task button at the bottom.

Since `802fa12`, tasks whose `due_at` falls before the start of today are filtered out entirely (`isBefore(startOfDay(due), startOfDay(now))`). All Tasks therefore only shows today, the future, and undated tasks. Past days are browsed from the Today screen.

### Activity Screen

File: `src/pages/Activity.jsx`

This is a time tracker.

The Track view shows:

- Active session banners with live timers.
- A list of user-created activities.
- Start/stop buttons for each activity.
- Manual time editing for today's total per activity.
- Delete activity buttons.
- Today's summary.
- Activity rings for the top activities.
- Analyze Data button.

The Add Activities modal lets the user add several activities in one modal session. After adding one activity, it clears the input and picks the next unused color.

The manual time modal sets total hours/minutes for one activity on a date. In the current UI it is only opened for today, even though the hook supports any date string.

The Analyze view shows:

- Day navigation.
- Donut chart of tracked vs untracked time.
- Activity breakdown legend.
- Horizontal comparison bars.
- Stats for total tracked, untracked, number of activities, and productivity percentage.

Untracked time is calculated as the elapsed portion of the selected day minus tracked time. For today, elapsed time is midnight to now. For past days, elapsed time is the full 24 hours.

### Analytics Screen

File: `src/pages/Analytics.jsx`

This is task-score analytics.

It shows:

- Monthly points.
- Average completion percentage.
- Day streak.
- Best day.
- A last-14-days bar chart.
- A monthly calendar heatmap.
- Tap-to-select details for a specific day.

Potential issue: the streak calculation appears to destructure `pct` from `getDailyScore()`, but `getDailyScore()` returns `earned`, `deducted`, `possible`, and `tasks`, not `pct`. This likely makes the streak stat unreliable or always zero.

### Profile Screen

File: `src/pages/Profile.jsx`

The profile screen shows:

- Signed-in email.
- Member since date.
- All-time stats:
  - Total points.
  - Tasks done.
  - Success rate.
- Browser notification permission button.
- Sign out button.

Potential scoring mismatch: total points here currently sum only `task.points` for completed tasks. It does not use `earnedPoints()`, so it ignores combo bonuses, deadline bonuses, and late penalties.

## Components

### `AddTaskModal.jsx`

This modal is used for both adding and editing tasks.

It includes:

- Title input.
- Optional notes/description.
- Inline calendar.
- Optional deadline toggle.
- Custom AM/PM time picker.
- Task class selector.
- Save-as-template button.
- Template chips when adding a task.

Templates are local-only and stored in `localStorage` through `useTemplates`.

The inline calendar in this modal disables past dates.

### `TaskItem.jsx`

This renders a task card.

It shows:

- Completion circle.
- Task class dot.
- Title.
- One-line description, if present.
- Deadline label when a timed deadline exists.
- Overdue, late, or on-time state.
- Points badge.
- Edit button for incomplete tasks.
- Note button for completed tasks.
- Delete button.

Completed tasks can have notes edited through `NoteModal`.

Locked task items cannot be toggled, edited, noted, or deleted. The Today screen uses this for past days.

The completion toggle is a native `<input type="checkbox" switch>` so that iOS 18+ fires haptics (see Recent Changes, `a70d25a`). On completion, `TaskItem` calls `emitCelebration({ origin, points, combo })` and does not render the confetti itself.

### `CelebrationRoot.jsx` + `lib/celebrate.js`

`celebrate.js` is a small listener set (`emitCelebration` / `subscribeCelebration`). `CelebrationRoot` is mounted once in `App.jsx`, subscribes to it, and for about 2 seconds portals the following into `document.body`: confetti tiered by points, a floating "+N pts / ×N combo" sticker badge, a screen-edge flash (combo ≥ 2), a second confetti wave (combo ≥ 4), and a "×N COMBO!" splash (combo ≥ 9). The `combo` value is the streak count *before* this completion, so the thresholds correspond to ×3/×5/×10 on screen.

### `CalendarPicker.jsx`

This is the full calendar modal used by the Today screen.

It shows:

- Month navigation.
- 42-cell fixed calendar grid.
- Color dots based on daily score:
  - Green for 80% or higher.
  - Yellow for 50% to 79%.
  - Red for below 50%.
- Go to Today shortcut.

### `BottomNav.jsx`

The bottom nav has five tabs and a sliding glass pill visual.

Tabs:

- Today
- Tasks
- Activity
- Analytics
- Profile

The whole app shell is constrained to `max-w-md`, so the UI behaves like a phone app even on desktop.

## Hooks

### `useTasks(user)`

Handles task state and Supabase persistence.

Responsibilities:

- Fetch tasks for the signed-in user.
- Subscribe to realtime task changes.
- Add tasks optimistically.
- Complete tasks optimistically.
- Uncomplete tasks optimistically.
- Delete tasks optimistically.
- Update tasks optimistically.
- Calculate tasks for a date.
- Calculate daily score.

Optimistic updates mean the UI changes immediately before Supabase confirms the write. On error, the hook reverts or refetches.

### `useActivities(user)`

Handles activity and session state.

Responsibilities:

- Fetch activities.
- Fetch sessions.
- Subscribe to realtime changes for both tables.
- Add activities optimistically.
- Delete activities optimistically.
- Start sessions.
- Stop sessions.
- Manually set total time for an activity on a date.
- Summarize sessions by date and activity.

Manual time setting deletes existing completed sessions for the activity/date, then creates one synthetic completed session with the desired duration.

### `useTemplates()`

Stores task templates in browser local storage under:

`doit_task_templates`

Templates are not synced to Supabase and are device/browser-specific.

## Realtime Behavior

Both tasks and activity data use Supabase realtime channels.

Task channel:

- Channel name: `tasks-realtime`
- Table: `tasks`
- Filtered by `user_id`

Activity channel:

- Channel name: `activities-realtime`
- Tables:
  - `activities`
  - `activity_sessions`
- Filtered by `user_id`

Realtime insert handlers avoid duplicates if the optimistic item is already present.

## Notifications

There are two notification approaches in the codebase.

The Profile screen uses the browser `Notification` API:

- Requests permission.
- Shows a test notification if permission is granted.
- Does not yet schedule real task reminders on the client.

OneSignal is also partially wired:

- `index.html` loads OneSignal Web SDK v16 and initializes a hard-coded app ID.
- `public/OneSignalSDKWorker.js` imports the OneSignal service worker script.
- `api/notify.js` is a serverless-style endpoint that queries incomplete timed tasks due in about 30 minutes and sends a OneSignal notification to the `All` segment.

Important caveats:

- `api/notify.js` requires server-side environment variables:
  - `VITE_SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `ONESIGNAL_REST_API_KEY`
  - `ONESIGNAL_APP_ID`
- It is not called from the frontend.
- It likely needs a cron job or hosted scheduled function to run regularly.
- It currently broadcasts to `included_segments: ['All']`, not to a specific user/device. That could notify the wrong users unless OneSignal user targeting is added.

## Styling And UX Direction

Since `20e905b` (May 2026) the app uses a light, playful **"sticker" design system**. The old dark theme is gone. The tokens are defined in `src/index.css` inside a Tailwind v4 `@theme` block:

- Background: warm cream (`bg-background`). Cards: white (`bg-card`). Muted: `bg-muted`.
- Ink: near-black `text-ink` / `border-ink`, used for all outlines and text.
- Palette: `primary` coral, `secondary` periwinkle, `accent` mustard, `sage` green, `destructive` red (all OKLCH).
- Fonts: `font-display` Fraunces (big headings and numbers), `font-sans` DM Sans (body), `font-mono` JetBrains Mono (small uppercase labels, `tracking-widest`). They are loaded from Google Fonts at the top of `index.css`.
- The signature look: thick `border-[3px] border-ink`, `rounded-2xl`/`rounded-3xl`, and hard offset shadows (`shadow-sticker-sm` / `shadow-sticker` / `shadow-sticker-lg`, i.e. 2/4/8px solid ink with no blur). Pressed states nudge down with `active:translate-y-0.5`.
- Score colors: sage ≥ 80%, mustard ≥ 50%, red below that.
- Modals are bottom sheets and sit above the floating bottom nav (z-index fix in `34c9679`).
- iOS safe-area handling around the bottom nav and floating buttons.

New UI should reuse these tokens and classes rather than raw hex colors.

Global CSS provides:

- Tap highlight removal.
- Cream body background and `overscroll-behavior: none`.
- Confetti, float-badge, screen-flash and splash animations used by `CelebrationRoot`.
- Small custom scrollbars.
- Task entry animation.
- Pop animations for task completion and score changes.
- Floating points animation.
- Perfect-score pulse.
- Active-session pulse.
- No-scrollbar utility.

## Setup Notes

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Required frontend environment variables are listed in `.env.example`:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not commit real `.env` values. `.env` is ignored by git. The local `.env` is already filled in and points at the production Supabase project, so local testing uses real data.

## Deployment

- Host: Vercel, connected to GitHub `nwabuokumich-debug/doit-app`.
- Every push to `main` auto-deploys. There is no staging environment or preview workflow in use, so run `npm run build` locally before pushing.
- The Vercel project needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set as environment variables. They are already configured.
- `api/notify.js` would deploy as a Vercel serverless function, but nothing schedules it (see Notifications).
- `public/manifest.json` makes the app installable. The owner runs it from the iPhone home screen, so test mobile/iOS behavior (safe areas, haptics, touch) before anything else.
- Owner preference: when changes are ready, commit and push to `main`. Don't ask for permission to deploy.

## Known Issues And Important Gaps

These are the most important things another ChatGPT session should know before proposing changes.

Status re-verified against the code on 2026-09-27. All of these are still open.

1. The Supabase schema file is out of date.

   The frontend expects task priorities like `light`, `basic`, `normal`, `solid`, `major`, `grand`, and `epic`, plus a `has_time_deadline` column. `supabase-schema.sql` still has `low`, `medium`, `high` and no `has_time_deadline`. The production DB has already been migrated, so only the file needs updating, for reproducibility.

2. The Analytics "Day Streak" is always 0 (confirmed bug).

   `Analytics.jsx` line ~54 does `const { pct } = getDailyScore(...)`, but `getDailyScore()` returns `earned`, `deducted`, `possible` and `tasks`, not `pct`. `pct` is `undefined`, `undefined >= 50` is false, and the loop breaks immediately. Fix: compute `possible > 0 ? earned / possible * 100 : 0` inside the loop. Also decide whether today, which is still in progress, should break the streak.

3. Profile total points are simpler than the real score.

   Profile totals only sum base task points for completed tasks. They do not include bonus points, time bonuses, late penalties, or deductions.

4. `useTasks.js` contains an unused `LATE_PENALTY` constant.

   The real late penalty comes from the level table.

5. `completeTask` defines `const task = tasks.find(...)` but does not use it.

   This is harmless but can be cleaned up.

6. Notification support is incomplete.

   Browser notification permission exists, OneSignal is initialized, and there is an API endpoint, but there is no complete user-specific reminder flow.

7. Task templates are local-only.

   They do not sync across devices.

8. There are no tests in the current repo.

   Important scoring logic, combo recalculation, and schema assumptions are untested.

9. `react-router-dom` and `recharts` are installed but not visibly used in the app source.

10. The OneSignal app ID is hard-coded in `index.html`, and `api/notify.js` broadcasts to every subscriber.

11. Uncommitted files (as of 2026-09-27): only `.claude/settings.local.json` (Claude Code permissions, not app code) and this `HANDOFF.md`. All app code is committed and deployed.

## Good Next-Step Ideas

High-value next steps:

- Update `supabase-schema.sql` so it matches the frontend fields and current level system.
- Fix the Analytics streak calculation.
- Make Profile stats use the same scoring helpers as the Today screen.
- Add tests for:
  - `earnedPoints`
  - `missedPoints`
  - daily score
  - combo bonus calculation
  - activity session summaries
- Decide whether notifications should be:
  - simple local browser reminders, or
  - OneSignal push notifications with user/device targeting.
- Move the OneSignal app ID out of `index.html` into environment configuration if this will be deployed in multiple environments.
- Consider syncing task templates to Supabase if the user expects them on all devices.
- Add a real README with setup, deployment, Supabase migration, and notification instructions.

## Mental Model For Future Development

Think of this app as three connected systems:

1. Task planning

   The user decides what should happen on a date. This is mostly `Today`, `AllTasks`, `AddTaskModal`, `TaskItem`, and `useTasks`.

2. Score/game mechanics

   The app turns tasks into motivation through difficulty levels, points, deadlines, penalties, perfect days, and combos. This is mostly `levels.js`, `useTasks.js`, and the combo logic in `Today.jsx`.

3. Time awareness

   The app helps the user understand how time was actually spent. This is `Activity.jsx`, `useActivities.js`, and the task completion `Timeline`.

Any new feature should be clear about which of these systems it belongs to. For example, "task reminders" belongs to task planning and notifications. "Pomodoro mode" would likely belong to activity/time tracking. "Achievements" would belong to score/game mechanics.

