// Shared "done" status helpers — a workout is done when every exercise, across
// its core/warmup/cooldown sections (only counting sections that have
// exercises), has every week marked done; a program is done when every
// configured workout is.
export function workoutSections(workout) {
  return [workout?.warmupExercises, workout?.exercises, workout?.cooldownExercises];
}

export function isWorkoutDone(workout) {
  const sections = workoutSections(workout).filter((exercises) => (exercises || []).length > 0);
  return sections.length > 0 &&
    sections.every((exercises) => exercises.every((ex) => (ex.weeks || []).every((w) => w.done)));
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
  return workouts.length > 0 && workouts.every(isWorkoutDone);
}
