import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { addSignOutButton } from "../auth-helpers.js";

const params     = new URLSearchParams(window.location.search);
const programId  = params.get("program");
const workoutId  = params.get("workout");

const exerciseRows = document.getElementById("exercise-rows");

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../login.html"; return; }
  addSignOutButton();

  const workoutSnap = await getDoc(doc(db, "programs", programId, "workouts", workoutId));
  if (!workoutSnap.exists()) {
    document.querySelector("main").innerHTML = `<p class="empty-state">Workout not found.</p>`;
    return;
  }

  const workout = workoutSnap.data();
  document.getElementById("title").value = workout.title || "";
  document.getElementById("notes").value = workout.notes || "";

  function addExerciseRow(ex = {}) {
    const card = document.createElement("div");
    card.className = "exercise-row exercise-card-form";
    card.innerHTML = `
      <div class="exercise-card-form-header">
        <input class="form-input ex-name" type="text" placeholder="Exercise name" value="${ex.name || ""}" required />
        <button type="button" class="btn-remove" aria-label="Remove exercise">✕</button>
      </div>
      <div class="exercise-card-form-fields">
        <div class="exercise-card-form-field">
          <label class="form-label">Sets</label>
          <input class="form-input ex-sets" type="number" placeholder="e.g. 3" min="1" value="${ex.sets || ""}" required />
        </div>
        <div class="exercise-card-form-field">
          <label class="form-label">Reps</label>
          <input class="form-input ex-reps" type="text" placeholder="e.g. 8" value="${ex.reps || ""}" required />
        </div>
      </div>
      <input class="form-input ex-note" type="text" placeholder="Note (optional)" value="${ex.note || ""}" />
    `;
    card.querySelector(".btn-remove").addEventListener("click", () => card.remove());
    exerciseRows.appendChild(card);
  }

  document.getElementById("add-exercise").addEventListener("click", () => addExerciseRow());

  workout.weeks[0].exercises.forEach((ex) => addExerciseRow(ex));

  document.getElementById("workout-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector(".btn-save");
    submitBtn.disabled    = true;
    submitBtn.textContent = "Saving…";

    const exercises = [...exerciseRows.querySelectorAll(".exercise-row")].map((row) => ({
      name: row.querySelector(".ex-name").value.trim(),
      sets: parseInt(row.querySelector(".ex-sets").value, 10),
      reps: row.querySelector(".ex-reps").value.trim(),
      note: row.querySelector(".ex-note").value.trim(),
    }));

    // Preserve per-week RPE, update exercises across all weeks
    const weeks = workout.weeks.map((week) => ({ ...week, exercises }));

    await updateDoc(doc(db, "programs", programId, "workouts", workoutId), {
      title: document.getElementById("title").value.trim(),
      notes: document.getElementById("notes").value.trim(),
      weeks,
    });

    window.location.href = `program.html?id=${programId}`;
  });
});
