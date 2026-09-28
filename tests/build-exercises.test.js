import { test } from "node:test";
import assert from "node:assert/strict";
import { buildExercisesWithWeeks } from "../docs/exercise-form-row.js";

// Mirrors the shape readExerciseRow() returns.
function raw(overrides = {}) {
  return {
    name: "Bench Press",
    sets: 3,
    reps: "5",
    setsOverride: false,
    perWeekSetsReps: false,
    weeklySets: null,
    weeklyReps: null,
    rpeOverride: false,
    weeklyRpe: null,
    weeklyEnabled: [],
    ...overrides,
  };
}

test("new exercise gets one empty, enabled week per program week", () => {
  const [ex] = buildExercisesWithWeeks([raw()], 3);
  assert.deepEqual(ex.weeks, [
    { weight: "", enabled: true },
    { weight: "", enabled: true },
    { weight: "", enabled: true },
  ]);
});

test("form-only fields are stripped from the stored exercise", () => {
  const [ex] = buildExercisesWithWeeks([raw()], 1);
  for (const key of ["weeklySets", "weeklyReps", "weeklyRpe", "weeklyEnabled"]) {
    assert.equal(key in ex, false, `${key} should be stripped`);
  }
  assert.equal(ex.name, "Bench Press");
});

test("per-week sets/reps are copied onto each week", () => {
  const [ex] = buildExercisesWithWeeks(
    [raw({ perWeekSetsReps: true, weeklySets: [3, 4], weeklyReps: ["8", "6"] })],
    2
  );
  assert.equal(ex.weeks[0].sets, 3);
  assert.equal(ex.weeks[0].reps, "8");
  assert.equal(ex.weeks[1].sets, 4);
  assert.equal(ex.weeks[1].reps, "6");
});

test("RPE override is copied onto each week", () => {
  const [ex] = buildExercisesWithWeeks([raw({ rpeOverride: true, weeklyRpe: [7, 8] })], 2);
  assert.deepEqual(ex.weeks.map((w) => w.rpe), [7, 8]);
});

test("unchecked weeks are stored as enabled: false", () => {
  const [ex] = buildExercisesWithWeeks([raw({ weeklyEnabled: [true, false] })], 2);
  assert.deepEqual(ex.weeks.map((w) => w.enabled), [true, false]);
});

test("edit preserves client data (weight/done/clientNote) by index", () => {
  const old = [{ weeks: [{ weight: "135", done: true, clientNote: "felt good" }, { weight: "140" }] }];
  const [ex] = buildExercisesWithWeeks([raw()], 2, old);
  assert.deepEqual(ex.weeks[0], { weight: "135", done: true, clientNote: "felt good", enabled: true });
  assert.deepEqual(ex.weeks[1], { weight: "140", enabled: true });
});

test("edit drops stale sets/reps/rpe/enabled when those options are turned off", () => {
  const old = [{ weeks: [{ weight: "135", sets: 5, reps: "3", rpe: 9, enabled: false }] }];
  const [ex] = buildExercisesWithWeeks([raw()], 1, old);
  assert.deepEqual(ex.weeks[0], { weight: "135", enabled: true });
});

test("edit with more weeks than before pads with empty weeks", () => {
  const old = [{ weeks: [{ weight: "135" }] }];
  const [ex] = buildExercisesWithWeeks([raw()], 2, old);
  assert.deepEqual(ex.weeks[1], { weight: "", enabled: true });
});
