import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { addSignOutButton, checkRole } from "../auth-helpers.js";
import { setupExerciseModal } from "../exercise-modal.js";
import { renderExerciseTable } from "../exercise-table.js";

const params    = new URLSearchParams(window.location.search);
const programId = params.get("program");
const workoutId = params.get("workout");

document.getElementById("back-link").href = `program.html?id=${programId}`;

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../login.html"; return; }
  addSignOutButton();
  if (!await checkRole(user, "client")) return;

  // Load workout and parent program in parallel
  const workoutRef = doc(db, "programs", programId, "workouts", workoutId);
  const [workoutSnap, programSnap] = await Promise.all([
    getDoc(workoutRef),
    getDoc(doc(db, "programs", programId)),
  ]);

  if (!workoutSnap.exists() || !programSnap.exists() || programSnap.data().clientId !== user.uid) {
    window.location.href = "index.html";
    return;
  }

  const workout = workoutSnap.data();

  document.getElementById("workout-title").textContent = workout.title;

  if (workout.notes) {
    document.getElementById("workout-notes").textContent = workout.notes;
  } else {
    document.getElementById("workout-notes-section").style.display = "none";
  }

  // The week to highlight/default into, e.g. from the "jump to next workout" link.
  const activeWeek = Math.max(
    0,
    Math.min(parseInt(params.get("week") || "0", 10), workout.weeks.length - 1)
  );

  // ── Weight persistence ─────────────────────────────────────────────────────
  async function saveWeight(weekIdx, exIdx, value) {
    workout.exercises[exIdx].weeks[weekIdx].weight = value;
    await updateDoc(workoutRef, { exercises: workout.exercises });
  }

  async function saveClientNote(weekIdx, exIdx, value) {
    workout.exercises[exIdx].weeks[weekIdx].clientNote = value;
    await updateDoc(workoutRef, { exercises: workout.exercises });
  }

  async function toggleDone(weekIdx, exIdx) {
    const week = workout.exercises[exIdx].weeks[weekIdx];
    week.done = !week.done;
    await updateDoc(workoutRef, { exercises: workout.exercises });
    renderTable();
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  const exModal = setupExerciseModal();

  // ── Exercise table ───────────────────────────────────────────────────────────
  const tableContainer = document.getElementById("exercise-table");

  function renderTable() {
    renderExerciseTable(tableContainer, workout, {
      editableWeight: true,
      showDone:       true,
      activeWeek,
      onSaveWeight:   saveWeight,
      onToggleDone:   toggleDone,
      onRowClick: (exIdx) => {
        exModal.openModal(workout.exercises[exIdx], exIdx, {
          workout,
          activeWeek,
          onSaveWeight: async (w, i, val) => {
            await saveWeight(w, i, val);
            renderTable();
          },
          onSaveNote: async (w, i, val) => {
            await saveClientNote(w, i, val);
            renderTable();
          },
          onToggleDone: toggleDone,
        });
      },
    });
  }

  renderTable();
});
