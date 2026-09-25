# pt-app

A static workout app hosted on GitHub Pages. No backend, no build step — plain HTML/CSS/JS.

## Live URLs
- Client: https://jules-pierce.github.io/pt-app/client/
- Provider: https://jules-pierce.github.io/pt-app/provider/
- Root redirects to client.

## Local development
Open `docs/client/index.html` or `docs/provider/index.html` directly in a browser.

## Deployment
GitHub Pages serves from the `main` branch, `/docs` folder. Pushes to `main` redeploy automatically. Check status at https://github.com/jules-pierce/pt-app/actions.

The user commits and pushes themselves — do not commit or push unless explicitly asked.

---

## Architecture

Two separate static apps share the same Firebase project (Firestore + Auth) and the same shared files at `docs/`.

### Shared files (`docs/`)
| File | Purpose |
|---|---|
| `firebase-config.js` | Firebase app, `db`, `auth` exports |
| `auth-helpers.js` | `addSignOutButton`, `checkRole` |
| `open-color.css` | Color palette variables |
| `styles.css` | All styles for both apps |
| `login.html` + `login.js` | Shared sign-in / sign-up page |
| `list.js` | Shared programs list logic (role-aware) |
| `exercise-form-row.js` | Shared exercise-row builder for the provider's Add/Edit workout forms (incl. per-week sets/reps) |

### Client (`docs/client/`)
The athlete-facing app. Read-only except for weight inputs.

| File | Purpose |
|---|---|
| `index.html` + `list.js` | Programs list (shim — imports `../list.js`) |
| `program.html` + `program.js` | Workouts within a program |
| `workout.html` + `workout.js` | Workout detail: week tabs, exercise cards, modal |

Navigation: `index.html` → `program.html?id=X` → `workout.html?program=X&workout=Y`

### Provider (`docs/provider/`)
The trainer-facing app. Creates and edits programs and workouts.

| File | Purpose |
|---|---|
| `index.html` + `list.js` | Programs list (shim — imports `../list.js`) |
| `program-new.html` + `program-new.js` | Create a new program |
| `program.html` + `program.js` | Workout slots; inline View and Edit modals |
| `add.html` + `provider.js` | Add a workout to a slot |

Navigation: `index.html` → `program-new.html` → `program.html?id=X` → `add.html?program=X&slot=N`

---

## Sharing between provider and client

**Goal: share as much as possible.** When adding a feature or file, default to putting it in `docs/` and making it work for both roles.

### What is already shared
- CSS (`docs/styles.css`) — one file for both apps
- Programs list (`docs/list.js`) — role-aware; queries by `providerId` or `clientId`, shows Delete and Create for providers only
- Login, Firebase config, auth helpers

### What still needs sharing (future work)
- Programs list page (`program.html`) — provider manages slots; client navigates to workouts. Provider page is the more capable one; client behaviour would be additive.

### Rules for shared JS files
- **HTML `<script src>` must always point to a same-directory file.** Chrome blocks `<script type="module" src="../file.js">` under `file://` due to cross-origin restrictions.
- **JS `import` statements may cross directories freely** — only `<script src>` in HTML is restricted.
- The pattern for shared logic: put the real code in `docs/shared-file.js`; create a one-line shim in each subdirectory (`import "../shared-file.js"`); HTML loads the shim.

---

## Data model

```js
// programs/{programId}
{
  title:        "Summer Strength",
  numWeeks:     8,
  workoutSlots: ["workoutDocId", null],  // null = slot not yet configured
  clientId:     "uid",
  providerId:   "uid",
  createdAt:    Timestamp,
}

// programs/{programId}/workouts/{workoutId}
{
  title:       "Upper Body",
  notes:       "Optional coaching note shown at top of workout",
  defaultSets: 3,           // workout-level default; exercises may override
  exercises: [
    {
      name:        "Bench Press",
      sets:        4,          // resolved value (default or override); if perWeekSetsReps, mirrors weeks[0].sets
      setsOverride: true,      // false = uses defaultSets, true = custom value; always false when perWeekSetsReps
      reps:        5,          // string or number ("Max", "60s", 10, etc.); if perWeekSetsReps, mirrors weeks[0].reps
      perWeekSetsReps: false,  // true = sets/reps vary per week (see weeks[].sets/reps below)
      rpeOverride: false,      // true = this exercise's RPE overrides the workout-level weeks[].rpe (see weeks[].rpe below)
      note:        "Optional exercise note shown in popup",
      weeks: [                 // length = program.numWeeks; weight, plus optional per-exercise overrides
        { weight: "" },
        { weight: "135 lbs" },
        // when perWeekSetsReps is true, each entry also carries its own sets/reps:
        // { weight: "", sets: 3, reps: "6" },
        // when rpeOverride is true, each entry also carries its own rpe (else falls back to workout.weeks[w].rpe):
        // { weight: "", rpe: 8 },
        // enabled defaults to true; set to false when the provider deselects this week
        // for this exercise via "Select weeks" — provider and client views show N/A instead:
        // { weight: "", enabled: false },
      ],
    }
  ],
  weeks: [          // length = program.numWeeks; RPE only, no weights here
    { rpe: 5 },
    { rpe: 6 },
  ],
}

// users/{uid}
{ role: "provider" | "client" }
```

---

## Key UI details

### Client workout page
- **Exercise table** (`exercise-table.js`, shared with the provider's View modal) — one column per program week, header shows that week's RPE; the current/next-incomplete week is highlighted. If an exercise has an RPE override, its own RPE for that week is shown as a small badge in the week cell (above the weight), alongside the per-week sets×reps badge when that's also set.
- **Exercise cards** — clicking opens a modal. Weight input on card stays in sync with modal.
- **Modal** — shows sets/reps, a weights table across all weeks (RPE column reflects a per-exercise override when set, else the workout-level RPE), an exercise note (if set), and an embedded video (`videos/video.MOV`).

### Provider program page
- Each slot starts as `null` and is configured via the add form.
- Configured slots show **View** (summary table with client weights, via the same `exercise-table.js`) and **Edit** (inline modal form) buttons.
- Unconfigured slots show `+` and navigate to `add.html`.
- Deleting a program is available on the list page. Deleting individual workouts is not supported (edit instead).

### Provider workout form (add + edit)
- `defaultSets` field sets the workout-level default.
- Each exercise's sets input is disabled (showing the default) until the provider clicks **Override**.
- Changing `defaultSets` live-updates all non-overriding exercise rows.
- **+ Add sets & reps per week** (purple button, per exercise) swaps the single Sets/Reps fields for one row per program week, letting the provider set a distinct sets/reps for each week. "Use one value for all weeks" reverts to the single-value fields.
- **+ Override RPE** (purple button, per exercise) reveals a table of one RPE input per program week for that exercise only, pre-filled from the workout-level Weekly RPE inputs; the table stays collapsed until clicked. "Use workout RPE" collapses it back and the exercise reverts to the workout-level RPE.
- **Select weeks** (purple button, per exercise) expands a checkbox per program week for that exercise, defaulting to all checked (all weeks selected/enabled). Unchecking a week stores `enabled: false` on that exercise's `weeks[w]`; both the provider and client views (`exercise-table.js`, `exercise-modal.js`) show N/A for that exercise/week instead of a weight input. A week with no exercises enabled for it is treated as automatically complete (see `workout-status.js`).

---

## Decisions & constraints
- No framework, no build step. Vanilla JS only.
- Persistence is Firebase Firestore + Auth.
- Exercises are stored once per workout. By default sets and reps are the same every week (only the logged weight changes week to week); a provider can opt an exercise into per-week sets/reps (`perWeekSetsReps: true`), which stores a distinct `sets`/`reps` on each entry in that exercise's `weeks` array.
- The `rpe` for each week is specified by the provider: one input per week on the Add Workout form (pre-filled with `5 + weekIndex` as a starting suggestion) and again on the Edit Workout modal, where it's pre-filled with the workout's current values.
- The video in the exercise modal is hardcoded to `videos/video.MOV` (relative to `client/`).
- Do not add dates to workouts — this was explicitly removed.
- Do not add category labels to exercises — this was explicitly removed.
