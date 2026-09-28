import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isWeekDone, isWeekSkipped, isWeekComplete, nextIncompleteWeek,
  isWorkoutComplete, workoutExerciseCount, workoutSetCount, isProgramDone,
} from "../docs/workout-status.js";

// Builds an exercise whose weeks[] entries come from `weeks` (e.g. [{ done: true }, {}]).
function ex(weeks, sets = 3) {
  return { name: "Ex", sets, weeks };
}

test("isWeekDone: false when the workout has no exercises", () => {
  assert.equal(isWeekDone({ exercises: [], weeks: [{}] }, 0), false);
  assert.equal(isWeekDone({}, 0), false);
});

test("isWeekDone: true only when every exercise is done for that week", () => {
  const workout = {
    exercises: [ex([{ done: true }, { done: true }]), ex([{ done: true }, {}])],
  };
  assert.equal(isWeekDone(workout, 0), true);
  assert.equal(isWeekDone(workout, 1), false);
});

test("isWeekDone: counts warmup and cooldown sections too", () => {
  const workout = {
    warmupExercises:   [ex([{}])],
    exercises:         [ex([{ done: true }])],
    cooldownExercises: [ex([{ done: true }])],
  };
  assert.equal(isWeekDone(workout, 0), false);
  workout.warmupExercises[0].weeks[0].done = true;
  assert.equal(isWeekDone(workout, 0), true);
});

test("isWeekDone: ignores empty sections", () => {
  const workout = { warmupExercises: [], exercises: [ex([{ done: true }])] };
  assert.equal(isWeekDone(workout, 0), true);
});

test("isWeekDone: disabled weeks count as done", () => {
  const workout = { exercises: [ex([{ enabled: false }]), ex([{ done: true }])] };
  assert.equal(isWeekDone(workout, 0), true);
});

test("isWeekDone: a week with every exercise disabled is automatically done", () => {
  const workout = { exercises: [ex([{ enabled: false }]), ex([{ enabled: false }])] };
  assert.equal(isWeekDone(workout, 0), true);
});

test("isWeekSkipped / isWeekComplete", () => {
  const workout = { exercises: [ex([{}, {}])], weeks: [{ skipped: true }, {}] };
  assert.equal(isWeekSkipped(workout, 0), true);
  assert.equal(isWeekSkipped(workout, 1), false);
  assert.equal(isWeekComplete(workout, 0), true);
  assert.equal(isWeekComplete(workout, 1), false);
});

test("nextIncompleteWeek: first week that is neither done nor skipped", () => {
  const workout = {
    exercises: [ex([{ done: true }, {}, {}])],
    weeks: [{}, { skipped: true }, {}],
  };
  assert.equal(nextIncompleteWeek(workout), 2);
});

test("nextIncompleteWeek: last week when everything is complete", () => {
  const workout = {
    exercises: [ex([{ done: true }, { done: true }])],
    weeks: [{}, {}],
  };
  assert.equal(nextIncompleteWeek(workout), 1);
});

test("nextIncompleteWeek: 0 when there are no weeks", () => {
  assert.equal(nextIncompleteWeek({ exercises: [] }), 0);
});

test("isWorkoutComplete", () => {
  assert.equal(isWorkoutComplete({ exercises: [ex([])], weeks: [] }), false);
  const workout = {
    exercises: [ex([{ done: true }, {}])],
    weeks: [{}, { skipped: true }],
  };
  assert.equal(isWorkoutComplete(workout), true);
  workout.weeks[1].skipped = false;
  assert.equal(isWorkoutComplete(workout), false);
});

test("workoutExerciseCount and workoutSetCount sum across sections", () => {
  const workout = {
    warmupExercises: [ex([], 1)],
    exercises: [ex([], 3), ex([], 4)],
  };
  assert.equal(workoutExerciseCount(workout), 3);
  assert.equal(workoutSetCount(workout), 8);
  assert.equal(workoutExerciseCount({}), 0);
  assert.equal(workoutSetCount({}), 0);
});

test("isProgramDone", () => {
  const done    = { exercises: [ex([{ done: true }])], weeks: [{}] };
  const notDone = { exercises: [ex([{}])], weeks: [{}] };

  assert.equal(isProgramDone([], {}), false);
  assert.equal(isProgramDone([null, null], {}), false);
  assert.equal(isProgramDone(["a", null], { a: done }), true);
  assert.equal(isProgramDone(["a", "b"], { a: done, b: notDone }), false);
  // Slots whose workout doc hasn't loaded are ignored.
  assert.equal(isProgramDone(["a", "missing"], { a: done }), true);
});
