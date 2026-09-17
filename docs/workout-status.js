// Shared "done" status helpers — a workout is done when every exercise has
// every week marked done; a program is done when every configured workout is.
export function isWorkoutDone(workout) {
  const exercises = workout?.exercises || [];
  return exercises.length > 0 && exercises.every((ex) => (ex.weeks || []).every((w) => w.done));
}

export function isProgramDone(slots, workoutDocs) {
  const workouts = (slots || []).filter(Boolean).map((id) => workoutDocs[id]).filter(Boolean);
  return workouts.length > 0 && workouts.every(isWorkoutDone);
}
