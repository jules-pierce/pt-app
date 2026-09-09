import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { addSignOutButton, checkRole } from "../auth-helpers.js";
import { setupExerciseModal } from "../exercise-modal.js";

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

  // ── Weight persistence ─────────────────────────────────────────────────────
  async function saveWeight(weekIdx, exIdx, value) {
    workout.exercises[exIdx].weeks[weekIdx].weight = value;
    await updateDoc(workoutRef, { exercises: workout.exercises });
  }

  async function saveClientNote(weekIdx, exIdx, value) {
    workout.exercises[exIdx].weeks[weekIdx].clientNote = value;
    await updateDoc(workoutRef, { exercises: workout.exercises });
  }

  function isWeekDone(weekIdx) {
    return workout.exercises.length > 0 &&
      workout.exercises.every(ex => ex.weeks?.[weekIdx]?.done);
  }

  async function toggleDone(weekIdx, exIdx) {
    const week = workout.exercises[exIdx].weeks[weekIdx];
    week.done = !week.done;
    await updateDoc(workoutRef, { exercises: workout.exercises });
    renderTabs();
    renderExercises();
  }

  // ── Week tabs ──────────────────────────────────────────────────────────────
  let activeWeek = Math.max(
    0,
    Math.min(parseInt(params.get("week") || "0", 10), workout.weeks.length - 1)
  );

  const tabNav = document.getElementById("week-tabs");

  function renderTabs() {
    tabNav.innerHTML = "";
    workout.weeks.forEach((week, i) => {
      const weekDone = isWeekDone(i);
      const btn = document.createElement("button");
      btn.className = "week-tab" + (i === activeWeek ? " active" : "") + (weekDone ? " week-done" : "");
      btn.innerHTML = `Week ${i + 1} <span class="tab-rpe">${weekDone ? "✓" : `RPE ${week.rpe}`}</span>`;
      btn.addEventListener("click", () => {
        activeWeek = i;
        const url = new URL(window.location);
        url.searchParams.set("week", i);
        history.replaceState(null, "", url);
        renderTabs();
        renderExercises();
      });
      tabNav.appendChild(btn);
    });
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  const exModal = setupExerciseModal();

  // ── Exercises ──────────────────────────────────────────────────────────────
  function renderExercises() {
    const exercises = workout.exercises;
    const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0);

    document.getElementById("total-exercises").textContent = exercises.length;
    document.getElementById("total-sets").textContent      = totalSets;
    document.getElementById("est-time").textContent        = Math.round(totalSets * 2.5) + " min";

    const list = document.getElementById("exercise-list");
    list.innerHTML = "";

    exercises.forEach((exercise, exIdx) => {
      const savedWeight = workout.exercises[exIdx]?.weeks?.[activeWeek]?.weight || "";

      const units = exercise.units || "lb";
      const suggestedHint = (activeWeek === 0 && exercise.suggestedWeight)
        ? `<span class="suggested-weight">Suggested start: ${exercise.suggestedWeight}</span>`
        : "";

      const isDone = workout.exercises[exIdx]?.weeks?.[activeWeek]?.done || false;

      const card = document.createElement("div");
      card.className    = "exercise-card" + (isDone ? " done" : "");
      card.style.cursor = "pointer";
      card.innerHTML = `
        <div class="exercise-header">
          <div class="exercise-number">${exIdx + 1}</div>
          <div class="exercise-info">
            <div class="exercise-name">${exercise.name}</div>
            ${suggestedHint}
          </div>
          <div class="exercise-prescription">
            <button class="btn-done${isDone ? " is-done" : ""}" aria-label="${isDone ? "Mark as not done" : "Mark as done"}">
              ${isDone ? "✓" : "Done"}
            </button>
            <span class="pill">${exercise.sets} sets</span>
            <span class="pill">${exercise.reps} reps</span>
            <input
              class="pill weight-input"
              type="text"
              placeholder="${units}"
              value="${savedWeight}"
              aria-label="Weight for ${exercise.name}"
            />
          </div>
        </div>
      `;

      const weightInput = card.querySelector(".weight-input");
      weightInput.addEventListener("blur", async (e) => {
        await saveWeight(activeWeek, exIdx, e.target.value);
      });
      weightInput.addEventListener("click", (e) => e.stopPropagation());

      card.querySelector(".btn-done").addEventListener("click", async (e) => {
        e.stopPropagation();
        await toggleDone(activeWeek, exIdx);
      });

      card.addEventListener("click", () => {
        exModal.openModal(exercise, exIdx, {
          workout,
          activeWeek,
          onSaveWeight: async (w, i, val) => {
            await saveWeight(w, i, val);
            if (w === activeWeek) {
              const cardInput = document.querySelector(
                `#exercise-list .exercise-card:nth-child(${i + 1}) .weight-input`
              );
              if (cardInput) cardInput.value = val;
            }
          },
          onSaveNote:    saveClientNote,
          onToggleDone:  toggleDone,
        });
      });
      list.appendChild(card);
    });
  }

  renderTabs();
  renderExercises();
});
