const params  = new URLSearchParams(window.location.search);
const progIdx = parseInt(params.get("program"), 10);
const slotIdx = parseInt(params.get("slot"), 10);

const programs = JSON.parse(localStorage.getItem("pt_programs") || "[]");
const program  = programs[progIdx];

// ── Exercise rows ─────────────────────────────────────────────────────────────
const exerciseRows = document.getElementById("exercise-rows");

function addExerciseRow(ex = {}) {
  const row = document.createElement("div");
  row.className = "exercise-row";
  row.innerHTML = `
    <input class="form-input ex-name" type="text"   placeholder="Exercise name" value="${ex.name || ""}" required />
    <input class="form-input ex-sets" type="number" placeholder="Sets"  min="1" value="${ex.sets || ""}" required />
    <input class="form-input ex-reps" type="text"   placeholder="Reps"          value="${ex.reps || ""}" required />
    <button type="button" class="btn-remove" aria-label="Remove exercise">✕</button>
    <input class="form-input ex-note" type="text"   placeholder="Note (optional)" value="${ex.note || ""}" />
  `;
  row.querySelector(".btn-remove").addEventListener("click", () => row.remove());
  exerciseRows.appendChild(row);
}

document.getElementById("add-exercise").addEventListener("click", () => addExerciseRow());
addExerciseRow();

// ── Form submit ───────────────────────────────────────────────────────────────
document.getElementById("workout-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const exercises = [...exerciseRows.querySelectorAll(".exercise-row")].map((row) => ({
    name: row.querySelector(".ex-name").value.trim(),
    sets: parseInt(row.querySelector(".ex-sets").value, 10),
    reps: row.querySelector(".ex-reps").value.trim(),
    note: row.querySelector(".ex-note").value.trim(),
  }));

  if (exercises.length === 0) return;

  const weeks = Array.from({ length: program.numWeeks }, (_, i) => ({
    rpe: 5 + i,
    exercises,
  }));

  programs[progIdx].workouts[slotIdx] = {
    title: document.getElementById("title").value.trim(),
    notes: document.getElementById("notes").value.trim(),
    weeks,
  };

  localStorage.setItem("pt_programs", JSON.stringify(programs));
  window.location.href = `program.html?idx=${progIdx}`;
});
