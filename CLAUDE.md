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

Two separate static apps share the same `localStorage` (same origin on GitHub Pages).

### Client (`docs/client/`)
The athlete-facing app. Read-only except for weight inputs.

| File | Purpose |
|---|---|
| `index.html` + `list.js` | Programs list |
| `program.html` + `program.js` | Workouts within a program |
| `workout.html` + `workout.js` | Workout detail: week tabs, exercise cards, modal |
| `workouts.js` | Loads `pt_programs` from localStorage |
| `styles.css` | All client styles |

Navigation: `index.html` → `program.html?idx=N` → `workout.html?program=N&workout=M`

### Provider (`docs/provider/`)
The trainer-facing app. Creates and edits programs and workouts.

| File | Purpose |
|---|---|
| `index.html` + `list.js` | Programs list |
| `program-new.html` + `program-new.js` | Create a new program |
| `program.html` + `program.js` | Workout slots within a program |
| `add.html` + `provider.js` | Add a workout to a slot |
| `edit.html` + `edit.js` | Edit an existing workout slot |
| `styles.css` | All provider styles |

Navigation: `index.html` → `program-new.html` → `program.html?idx=N` → `add.html?program=N&slot=M` or `edit.html?program=N&slot=M`

---

## Data model

Everything lives in `localStorage` under the key `pt_programs`.

```js
// pt_programs: Program[]
{
  title: "Summer Strength",   // string
  numWeeks: 8,                // number — how many weeks long the program is
  workouts: [                 // length = numWorkouts set at creation time
    {
      title: "Upper Body",
      notes: "Optional coaching note shown at top of workout",
      weeks: [                // length = program.numWeeks
        {
          rpe: 5,             // starts at 5, increments by 1 per week
          exercises: [
            {
              name: "Bench Press",
              sets: 4,
              reps: 5,        // string or number ("Max", "60s", 10, etc.)
              note: "Optional exercise-specific note shown in popup",
            }
          ]
        }
      ]
    },
    null,   // null = slot not yet configured
  ]
}
```

Weight entries logged by the client are stored separately:
- Key: `pt_weight_p{progIdx}_wo{workoutIdx}_wk{weekIdx}_e{exIdx}`
- Value: string (e.g. "135 lbs")

---

## Key UI details

### Client workout page
- **Week tabs** — one per `program.numWeeks`, shows RPE. Switches active week.
- **Exercise cards** — clicking opens a modal. Weight input on card stays in sync with modal.
- **Modal** — shows sets/reps, a weights table across all weeks, an exercise note (if set), and an embedded video (`videos/video.MOV`).

### Provider
- Programs are created with a title, number of weeks, and number of workout slots.
- Each slot starts as `null` and is configured by filling in the add workout form.
- Configured slots are clickable → edit form. Unconfigured slots show "+ Configure".
- Deleting a program removes it from `pt_programs`. Deleting is not available for individual workouts (edit instead).

---

## Decisions & constraints
- No framework, no build step. Vanilla JS only.
- All persistence is `localStorage`. There is no backend.
- The client and provider share `localStorage` because they are served from the same origin.
- Weeks all share the same exercises within a workout (per-week weight variation is tracked by the client via localStorage, not in the program data).
- The `rpe` for each week is set when the workout is first saved: `5 + weekIndex`. It is preserved on edits.
- The video in the exercise modal is hardcoded to `videos/video.MOV` (relative to `client/`).
- Do not add dates to workouts — this was explicitly removed.
- Do not add category labels to exercises — this was explicitly removed.
