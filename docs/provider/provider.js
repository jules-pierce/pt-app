// ── Helpers ───────────────────────────────────────────────────────────────────
function loadCustom() {
  return JSON.parse(localStorage.getItem("pt_custom_workouts") || "[]");
}

function saveCustom(workouts) {
  localStorage.setItem("pt_custom_workouts", JSON.stringify(workouts));
}

function makeWeeks(exercises) {
  return [0, 1, 2, 3].map((i) => ({ exercises, rpe: 5 + i }));
}

// ── Exercise rows ─────────────────────────────────────────────────────────────
const exerciseRows = document.getElementById("exercise-rows");

function addExerciseRow(ex = {}) {
  const row = document.createElement("div");
  row.className = "exercise-row";
  row.innerHTML = `
    <input class="form-input ex-name"     type="text"   placeholder="Exercise name" value="${ex.name     || ""}" required />
    <input class="form-input ex-category" type="text"   placeholder="Category"      value="${ex.category || ""}" />
    <input class="form-input ex-sets"     type="number" placeholder="Sets"  min="1" value="${ex.sets     || ""}" required />
    <input class="form-input ex-reps"     type="text"   placeholder="Reps"          value="${ex.reps     || ""}" required />
    <button type="button" class="btn-remove" aria-label="Remove exercise">✕</button>
  `;
  row.querySelector(".btn-remove").addEventListener("click", () => row.remove());
  exerciseRows.appendChild(row);
}

document.getElementById("add-exercise").addEventListener("click", () => addExerciseRow());

// Start with one empty row
addExerciseRow();

// ── Form submit ───────────────────────────────────────────────────────────────
document.getElementById("workout-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const exercises = [...exerciseRows.querySelectorAll(".exercise-row")].map((row) => ({
    name:     row.querySelector(".ex-name").value.trim(),
    category: row.querySelector(".ex-category").value.trim(),
    sets:     parseInt(row.querySelector(".ex-sets").value, 10),
    reps:     row.querySelector(".ex-reps").value.trim(),
  }));

  if (exercises.length === 0) return;

  const workout = {
    title: document.getElementById("title").value.trim(),
    notes: document.getElementById("notes").value.trim(),
    weeks: makeWeeks(exercises),
  };

  const custom = loadCustom();
  custom.push(workout);
  saveCustom(custom);

  window.location.href = "index.html";
});
