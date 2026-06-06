import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, addDoc, updateDoc, collection } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { addSignOutButton, checkRole } from "../auth-helpers.js";

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

// ── Exercise card builder ─────────────────────────────────────────────────────
const exerciseRows = document.getElementById("exercise-rows");

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

document.getElementById("workout-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !program) return;

  const submitBtn = e.target.querySelector(".btn-save");
  submitBtn.disabled    = true;
  submitBtn.textContent = "Saving…";

  try {
    const exercises = [...exerciseRows.querySelectorAll(".exercise-row")].map((row) => ({
      name: row.querySelector(".ex-name").value.trim(),
      sets: parseInt(row.querySelector(".ex-sets").value, 10),
      reps: row.querySelector(".ex-reps").value.trim(),
      note: row.querySelector(".ex-note").value.trim(),
    }));

    if (exercises.length === 0) {
      submitBtn.disabled    = false;
      submitBtn.textContent = "Save Workout";
      return;
    }

    const weeks = Array.from({ length: program.numWeeks }, (_, i) => ({
      rpe: 5 + i,
      exercises,
    }));

    const workoutRef = await addDoc(collection(db, "programs", programId, "workouts"), {
      title: document.getElementById("title").value.trim(),
      notes: document.getElementById("notes").value.trim(),
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
