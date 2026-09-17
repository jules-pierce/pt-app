import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, addDoc, updateDoc, collection } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { addSignOutButton, checkRole } from "../auth-helpers.js";
import { addExerciseRow, readExerciseRow } from "../exercise-form-row.js";

const params    = new URLSearchParams(window.location.search);
const programId = params.get("program");
const slotIdx   = parseInt(params.get("slot"), 10);

let currentUser = null;
let program     = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../login.html"; return; }
  addSignOutButton();
  if (!await checkRole(user, "provider")) return;
  currentUser = user;

  const programSnap = await getDoc(doc(db, "programs", programId));
  if (programSnap.exists()) program = programSnap.data();
});

const exerciseRows    = document.getElementById("exercise-rows");
const defaultSetsInput = document.getElementById("default-sets");

function getDefaultSets() {
  return parseInt(defaultSetsInput.value, 10) || null;
}

defaultSetsInput.addEventListener("input", () => {
  const val = getDefaultSets();
  exerciseRows.querySelectorAll(".exercise-row").forEach((row) => {
    const input = row.querySelector(".ex-sets");
    if (input.disabled) input.value = val ?? "";
  });
});

document.getElementById("add-exercise").addEventListener("click", () => {
  addExerciseRow(exerciseRows, {}, false, { getDefaultSets, numWeeks: program?.numWeeks ?? 1 });
});

document.getElementById("workout-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !program) return;

  const submitBtn = e.target.querySelector(".btn-save");
  submitBtn.disabled    = true;
  submitBtn.textContent = "Saving…";

  try {
    const defaultSets = getDefaultSets();

    const exercises = [...exerciseRows.querySelectorAll(".exercise-row")].map((row) =>
      readExerciseRow(row, defaultSets)
    );

    if (exercises.length === 0) {
      submitBtn.disabled    = false;
      submitBtn.textContent = "Save Workout";
      return;
    }

    const weeks = Array.from({ length: program.numWeeks }, (_, i) => ({ rpe: 5 + i }));

    const exercisesWithWeeks = exercises.map(({ weeklySets, weeklyReps, ...ex }) => ({
      ...ex,
      weeks: Array.from({ length: program.numWeeks }, (_, w) =>
        ex.perWeekSetsReps ? { weight: "", sets: weeklySets[w], reps: weeklyReps[w] } : { weight: "" }
      ),
    }));

    const workoutRef = await addDoc(collection(db, "programs", programId, "workouts"), {
      title:      document.getElementById("title").value.trim(),
      notes:      document.getElementById("notes").value.trim(),
      defaultSets,
      exercises:  exercisesWithWeeks,
      weeks,
    });

    const slots = [...(program.workoutSlots || [])];
    slots[slotIdx] = workoutRef.id;
    await updateDoc(doc(db, "programs", programId), { workoutSlots: slots });

    window.location.href = `program.html?id=${programId}`;
  } catch (err) {
    alert(`Error: ${err.message}`);
    submitBtn.disabled    = false;
    submitBtn.textContent = "Save Workout";
  }
});
