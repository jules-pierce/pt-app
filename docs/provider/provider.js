import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, getDocs, addDoc, updateDoc, collection, query, where } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
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

// ── Copy from a previous workout ────────────────────────────────────────────
const copyBtn     = document.getElementById("copy-workout-btn");
const copyOverlay = document.getElementById("copy-workout-overlay");
const copyList    = document.getElementById("copy-workout-list");

copyBtn.addEventListener("click", () => {
  copyOverlay.hidden = false;
  loadCopySources();
});
document.getElementById("copy-workout-close").addEventListener("click", () => { copyOverlay.hidden = true; });
copyOverlay.addEventListener("click", (e) => { if (e.target === copyOverlay) copyOverlay.hidden = true; });

async function loadCopySources() {
  copyList.innerHTML = `<p class="empty-state">Loading…</p>`;

  const programsSnap = await getDocs(
    query(collection(db, "programs"), where("providerId", "==", currentUser.uid))
  );

  const groups = [];
  for (const programDoc of programsSnap.docs) {
    const workoutsSnap = await getDocs(collection(db, "programs", programDoc.id, "workouts"));
    if (workoutsSnap.empty) continue;
    groups.push({
      title:    programDoc.data().title || "Untitled",
      workouts: workoutsSnap.docs.map((d) => ({
        id:        d.id,
        programId: programDoc.id,
        title:     d.data().title || "Untitled",
      })),
    });
  }

  if (groups.length === 0) {
    copyList.innerHTML = `<p class="empty-state">No existing workouts to copy from.</p>`;
    return;
  }

  copyList.innerHTML = "";
  groups.forEach((group) => {
    const groupEl = document.createElement("div");
    groupEl.className = "copy-source-group";
    groupEl.innerHTML = `<div class="slot-label">${group.title}</div>`;

    group.workouts.forEach((w) => {
      const row = document.createElement("div");
      row.className = "saved-row saved-row--clickable";
      row.innerHTML = `
        <div class="saved-info"><div class="saved-title">${w.title}</div></div>
        <span class="slot-arrow">›</span>
      `;
      row.addEventListener("click", () => applyCopySource(w.programId, w.id));
      groupEl.appendChild(row);
    });

    copyList.appendChild(groupEl);
  });
}

async function applyCopySource(sourceProgramId, sourceWorkoutId) {
  const workoutSnap = await getDoc(doc(db, "programs", sourceProgramId, "workouts", sourceWorkoutId));
  if (!workoutSnap.exists()) return;
  const workout = workoutSnap.data();

  document.getElementById("title").value = workout.title || "";
  document.getElementById("notes").value = workout.notes || "";
  defaultSetsInput.value = workout.defaultSets ?? "";
  exerciseRows.innerHTML = "";

  (workout.exercises || []).forEach((ex) => {
    const overriding = ex.setsOverride !== false;
    addExerciseRow(exerciseRows, ex, overriding, { getDefaultSets, numWeeks: program?.numWeeks ?? 1 });
  });

  copyOverlay.hidden = true;
}

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
