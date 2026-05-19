# pt-app

Workout display site hosted on GitHub Pages.

## Live site

https://jules-pierce.github.io/pt-app/

## Deployment

The site deploys automatically on every push to `main`. No manual steps needed.

To check deployment status: https://github.com/jules-pierce/pt-app/actions

## Local development

Open `docs/index.html` directly in your browser. No build step required.

## Adding workouts

Edit the `workouts` array in `docs/workouts.js`. Each workout follows this shape:

```js
{
  title: "Workout Name",
  date: "Monday, Jan 1 2026",
  notes: "Optional coaching note shown at the top.",
  exercises: [
    { name: "Exercise Name", category: "Muscle Group", sets: 3, reps: 10, weight: "100 lbs" },
  ],
}
```
