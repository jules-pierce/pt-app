// Shared "done"/"skipped" status helpers. A week is done when every exercise
// across a workout's core/warmup/cooldown sections (only counting sections
// that have exercises) has that week marked done. Skipping is a separate
// per-week flag (workout.weeks[w].skipped) that does not touch exercise done
// state, but counts as complete alongside "done" everywhere completeness is
// checked. A workout/program is done when every one of its weeks/workouts is
// complete (done or skipped).
export function workoutSections(workout) {
  return [workout?.warmupExercises, workout?.exercises, workout?.cooldownExercises];
}

export function isWeekDone(workout, w) {
  const sections = workoutSections(workout).filter((exercises) => (exercises || []).length > 0);
  return sections.length > 0 &&
    sections.every((exercises) => exercises.every((ex) => ex.weeks?.[w]?.enabled === false || ex.weeks?.[w]?.done));
}

export function isWeekSkipped(workout, w) {
  return !!workout?.weeks?.[w]?.skipped;
}

export function isWeekComplete(workout, w) {
  return isWeekDone(workout, w) || isWeekSkipped(workout, w);
}

// The next week that still needs action: the first not-yet-complete week, or
// the last week if every week is already done/skipped (so a "done"/"skipped"
// action button always has a week to act on, for undo).
export function nextIncompleteWeek(workout) {
  const numWeeks = workout.weeks?.length ?? 0;
  for (let w = 0; w < numWeeks; w++) {
    if (!isWeekComplete(workout, w)) return w;
  }
  return Math.max(0, numWeeks - 1);
}

export function isWorkoutComplete(workout) {
  const numWeeks = workout.weeks?.length ?? 0;
  if (numWeeks === 0) return false;
  for (let w = 0; w < numWeeks; w++) {
    if (!isWeekComplete(workout, w)) return false;
  }
  return true;
}

export function workoutExerciseCount(workout) {
  return workoutSections(workout).reduce((sum, exercises) => sum + (exercises || []).length, 0);
}

export function workoutSetCount(workout) {
  return workoutSections(workout).reduce(
    (sum, exercises) => sum + (exercises || []).reduce((s, ex) => s + ex.sets, 0),
    0
  );
}

export function isProgramDone(slots, workoutDocs) {
  const workouts = (slots || []).filter(Boolean).map((id) => workoutDocs[id]).filter(Boolean);
  return workouts.length > 0 && workouts.every(isWorkoutComplete);
}
