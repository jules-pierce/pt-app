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

function makeExerciseRow(ex, overriding) {
  const setsVal = overriding ? (ex.sets ?? "") : (getDefaultSets() ?? "");
  const card = document.createElement("div");
  card.className = "exercise-row exercise-card-form";
  card.innerHTML = `
    <div class="exercise-card-form-header">
      <input class="form-input ex-name" type="text" placeholder="Exercise name" value="${ex.name || ""}" required />
      <button type="button" class="btn-remove" aria-label="Remove exercise">✕</button>
    </div>
    <div class="exercise-card-form-fields">
      <div class="exercise-card-form-field">
        <div class="form-label-row">
          <label class="form-label">Sets</label>
          <button type="button" class="btn-sets-toggle">${overriding ? "Use default" : "Override"}</button>
        </div>
        <input class="form-input ex-sets" type="number" min="1" value="${setsVal}" ${overriding ? "" : "disabled"} />
      </div>
      <div class="exercise-card-form-field">
        <label class="form-label">Reps</label>
        <input class="form-input ex-reps" type="text" placeholder="e.g. 8" value="${ex.reps || ""}" required />
      </div>
    </div>
    <input class="form-input ex-note" type="text" placeholder="Note (optional)" value="${ex.note || ""}" />
  `;

  const setsInput = card.querySelector(".ex-sets");
  const toggleBtn = card.querySelector(".btn-sets-toggle");

  toggleBtn.addEventListener("click", () => {
    if (setsInput.disabled) {
      setsInput.disabled = false;
      setsInput.focus();
      toggleBtn.textContent = "Use default";
    } else {
      setsInput.disabled = true;
      setsInput.value = getDefaultSets() ?? "";
      toggleBtn.textContent = "Override";
    }
  });

  card.querySelector(".btn-remove").addEventListener("click", () => card.remove());
  exerciseRows.appendChild(card);
}

document.getElementById("add-exercise").addEventListener("click", () => makeExerciseRow({}, false));

document.getElementById("workout-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !program) return;

  const submitBtn = e.target.querySelector(".btn-save");
  submitBtn.disabled    = true;
  submitBtn.textContent = "Saving…";

  try {
    const defaultSets = getDefaultSets();

    const exercises = [...exerciseRows.querySelectorAll(".exercise-row")].map((row) => {
      const setsInput   = row.querySelector(".ex-sets");
      const setsOverride = !setsInput.disabled;
      return {
        name:        row.querySelector(".ex-name").value.trim(),
        sets:        setsOverride ? parseInt(setsInput.value, 10) : defaultSets,
        reps:        row.querySelector(".ex-reps").value.trim(),
        note:        row.querySelector(".ex-note").value.trim(),
        setsOverride,
      };
    });

    if (exercises.length === 0) {
      submitBtn.disabled    = false;
      submitBtn.textContent = "Save Workout";
      return;
    }

    const weeks = Array.from({ length: program.numWeeks }, (_, i) => ({ rpe: 5 + i }));

    const exercisesWithWeeks = exercises.map((ex) => ({
      ...ex,
      weeks: Array.from({ length: program.numWeeks }, () => ({ weight: "" })),
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
