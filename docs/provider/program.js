import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { addSignOutButton, checkRole } from "../auth-helpers.js";

const params    = new URLSearchParams(window.location.search);
const programId = params.get("id");

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../login.html"; return; }
  addSignOutButton();
  if (!await checkRole(user, "provider")) return;

  const programSnap = await getDoc(doc(db, "programs", programId));
  if (!programSnap.exists()) {
    document.querySelector("main").innerHTML = `<p class="empty-state">Program not found.</p>`;
    return;
  }

  const program = programSnap.data();
  document.getElementById("program-title").textContent = program.title;
  document.getElementById("program-meta").textContent  =
    `${program.numWeeks} weeks · ${program.workoutSlots.length} workouts`;

  const slots = program.workoutSlots || [];

  const workoutDocs = {};
  await Promise.all(
    slots.filter(Boolean).map(async (wId) => {
      const snap = await getDoc(doc(db, "programs", programId, "workouts", wId));
      if (snap.exists()) workoutDocs[wId] = snap.data();
    })
  );

  const container = document.getElementById("workout-slots");

  // ── View modal ───────────────────────────────────────────────────────────────
  const viewOverlay = document.getElementById("view-modal-overlay");

  function openViewModal(workout) {
    document.getElementById("view-modal-title").textContent = workout.title || "Untitled";

    const body      = document.getElementById("view-modal-body");
    const weeks     = workout.weeks     || [];
    const exercises = workout.exercises || [];

    if (exercises.length === 0) {
      body.innerHTML = `<p class="empty-state">No exercises.</p>`;
    } else {
      const weekHeaders = weeks.map((w, i) =>
        `<th>Wk ${i + 1}<small>RPE ${w.rpe}</small></th>`
      ).join("");

      const rows = exercises.map((ex) => {
        const weightCells = weeks.map((_, w) => {
          const weight = ex.weeks?.[w]?.weight || "—";
          return `<td>${weight}</td>`;
        }).join("");
        return `<tr>
          <td>${ex.name}</td>
          <td>${ex.sets}</td>
          <td>${ex.reps}</td>
          ${weightCells}
        </tr>`;
      }).join("");

      body.innerHTML = `
        <table class="view-table">
          <thead><tr><th>Exercise</th><th>Sets</th><th>Reps</th>${weekHeaders}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }

    viewOverlay.hidden = false;
  }

  document.getElementById("view-modal-close").addEventListener("click", () => { viewOverlay.hidden = true; });
  viewOverlay.addEventListener("click", (e) => { if (e.target === viewOverlay) viewOverlay.hidden = true; });

  // ── Edit modal ───────────────────────────────────────────────────────────────
  const editOverlay      = document.getElementById("edit-modal-overlay");
  const editExerciseRows = document.getElementById("edit-exercise-rows");
  const editForm         = document.getElementById("edit-modal-form");

  let activeWorkoutId  = null;
  let activeWorkout    = null;

  function addEditExerciseRow(ex = {}) {
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
    editExerciseRows.appendChild(card);
  }

  function openEditModal(workout, workoutId) {
    activeWorkoutId = workoutId;
    activeWorkout   = workout;

    document.getElementById("edit-title").value = workout.title || "";
    document.getElementById("edit-notes").value = workout.notes || "";
    editExerciseRows.innerHTML = "";
    workout.exercises.forEach((ex) => addEditExerciseRow(ex));

    editOverlay.hidden = false;
  }

  document.getElementById("edit-modal-close").addEventListener("click", () => { editOverlay.hidden = true; });
  editOverlay.addEventListener("click", (e) => { if (e.target === editOverlay) editOverlay.hidden = true; });
  document.getElementById("edit-add-exercise").addEventListener("click", () => addEditExerciseRow());

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = editForm.querySelector(".btn-save");
    submitBtn.disabled    = true;
    submitBtn.textContent = "Saving…";

    try {
      const oldExercises = activeWorkout.exercises || [];
      const exercises = [...editExerciseRows.querySelectorAll(".exercise-row")].map((row, i) => ({
        name:  row.querySelector(".ex-name").value.trim(),
        sets:  parseInt(row.querySelector(".ex-sets").value, 10),
        reps:  row.querySelector(".ex-reps").value.trim(),
        note:  row.querySelector(".ex-note").value.trim(),
        weeks: oldExercises[i]?.weeks
          ?? Array.from({ length: activeWorkout.weeks.length }, () => ({ weight: "" })),
      }));

      const newTitle = document.getElementById("edit-title").value.trim();
      const newNotes = document.getElementById("edit-notes").value.trim();

      await updateDoc(doc(db, "programs", programId, "workouts", activeWorkoutId), {
        title: newTitle,
        notes: newNotes,
        exercises,
      });

      workoutDocs[activeWorkoutId] = { ...activeWorkout, title: newTitle, notes: newNotes, exercises };
      editOverlay.hidden = true;
      renderSlots();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = "Save Changes";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!viewOverlay.hidden) viewOverlay.hidden = true;
    else if (!editOverlay.hidden) editOverlay.hidden = true;
  });

  // ── Slot rows ────────────────────────────────────────────────────────────────
  function renderSlots() {
    container.innerHTML = "";
    slots.forEach((workoutId, slotIdx) => {
      const workout = workoutId ? workoutDocs[workoutId] : null;
      const row = document.createElement("div");
      row.className = "saved-row";

      if (workout) {
        const exCount = workout.exercises?.length ?? 0;
        row.innerHTML = `
          <div class="saved-info">
            <div class="slot-label">Workout ${slotIdx + 1}</div>
            <div class="saved-title">${workout.title || "Untitled"}</div>
            <div class="saved-meta">${exCount} exercise${exCount !== 1 ? "s" : ""}</div>
          </div>
          <div class="slot-actions">
            <button class="btn-action btn-view">View</button>
            <button class="btn-action btn-action--primary btn-edit">Edit</button>
          </div>
        `;
        row.querySelector(".btn-edit").addEventListener("click", () => openEditModal(workoutDocs[workoutId], workoutId));
        row.querySelector(".btn-view").addEventListener("click", () => openViewModal(workoutDocs[workoutId]));
      } else {
        row.classList.add("saved-row--clickable");
        row.innerHTML = `
          <div class="saved-info">
            <div class="slot-label">Workout ${slotIdx + 1}</div>
            <div class="saved-title empty">Not configured</div>
          </div>
          <span class="slot-arrow">+</span>
        `;
        row.addEventListener("click", () => {
          window.location.href = `add.html?program=${programId}&slot=${slotIdx}`;
        });
      }

      container.appendChild(row);
    });
  }

  renderSlots();
});
