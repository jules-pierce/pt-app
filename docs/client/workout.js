import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { addSignOutButton, checkRole } from "../auth-helpers.js";
import { setupExerciseModal } from "../exercise-modal.js";
import { renderExerciseTable } from "../exercise-table.js";
import { isWorkoutDone } from "../workout-status.js";

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

  // ── Modal ──────────────────────────────────────────────────────────────────
  const exModal = setupExerciseModal();

  // ── Exercise sections (warmup / core / cooldown) ────────────────────────────
  function makeSection(key, sectionEl, tableContainer) {
    const exercises = () => workout[key] || [];

    async function saveWeight(weekIdx, exIdx, value) {
      exercises()[exIdx].weeks[weekIdx].weight = value;
      await updateDoc(workoutRef, { [key]: workout[key] });
    }

    async function saveClientNote(weekIdx, exIdx, value) {
      exercises()[exIdx].weeks[weekIdx].clientNote = value;
      await updateDoc(workoutRef, { [key]: workout[key] });
    }

    async function toggleDone(weekIdx, exIdx) {
      const week = exercises()[exIdx].weeks[weekIdx];
      week.done = !week.done;
      await updateDoc(workoutRef, { [key]: workout[key] });
      renderTable();
      renderDoneButton();
    }

    function renderTable() {
      const exs = exercises();
      if (sectionEl) sectionEl.hidden = exs.length === 0;
      renderExerciseTable(tableContainer, exs, workout.weeks, {
        editableWeight: true,
        showDone:       true,
        activeWeek,
        onSaveWeight:   saveWeight,
        onToggleDone:   toggleDone,
        onRowClick: (exIdx) => {
          exModal.openModal(exs[exIdx], exIdx, {
            exercises: exs,
            weeks: workout.weeks,
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

    return { renderTable };
  }

  const warmupSection   = makeSection("warmupExercises", document.getElementById("warmup-section"), document.getElementById("warmup-table"));
  const coreSection     = makeSection("exercises", null, document.getElementById("exercise-table"));
  const cooldownSection = makeSection("cooldownExercises", document.getElementById("cooldown-section"), document.getElementById("cooldown-table"));

  function renderTable() {
    warmupSection.renderTable();
    coreSection.renderTable();
    cooldownSection.renderTable();
  }

  // ── Workout-level done button ───────────────────────────────────────────────
  const doneBtn = document.getElementById("workout-done-btn");

  function renderDoneButton() {
    const complete = isWorkoutDone(workout);
    doneBtn.textContent = complete ? "✓ Workout Done" : "Mark Workout Done";
    doneBtn.classList.toggle("is-complete", complete);
  }

  doneBtn.addEventListener("click", async () => {
    const target = !isWorkoutDone(workout);
    const update = {};
    ["warmupExercises", "exercises", "cooldownExercises"].forEach((key) => {
      (workout[key] || []).forEach((ex) => ex.weeks.forEach((w) => { w.done = target; }));
      if (workout[key]) update[key] = workout[key];
    });
    doneBtn.disabled = true;
    await updateDoc(workoutRef, update);
    doneBtn.disabled = false;
    renderDoneButton();
    renderTable();
  });

  renderTable();
  renderDoneButton();
});
