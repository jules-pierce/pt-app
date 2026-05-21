const params  = new URLSearchParams(window.location.search);
const progIdx = parseInt(params.get("idx"), 10);
const programs = JSON.parse(localStorage.getItem("pt_programs") || "[]");
const program  = programs[progIdx];

if (!program) {
  document.querySelector("main").innerHTML = `<p class="empty-state">Program not found.</p>`;
} else {
  document.getElementById("program-title").textContent = program.title;
  document.getElementById("program-meta").textContent =
    `${program.numWeeks} weeks · ${program.workouts.length} workouts`;

  const container = document.getElementById("workout-slots");

  program.workouts.forEach((workout, slotIdx) => {
    const row = document.createElement("div");
    row.className = "saved-row saved-row--clickable";

    if (workout) {
      const exCount = workout.weeks[0]?.exercises?.length ?? 0;
      row.innerHTML = `
        <div class="saved-info">
          <div class="slot-label">Workout ${slotIdx + 1}</div>
          <div class="saved-title">${workout.title || "Untitled"}</div>
          <div class="saved-meta">${exCount} exercises</div>
        </div>
        <span class="slot-arrow">→</span>
      `;
      row.addEventListener("click", () => {
        window.location.href = `edit.html?program=${progIdx}&slot=${slotIdx}`;
      });
    } else {
      row.className += " saved-row--empty";
      row.innerHTML = `
        <div class="saved-info">
          <div class="slot-label">Workout ${slotIdx + 1}</div>
          <div class="saved-title empty">Not configured</div>
        </div>
        <span class="slot-arrow">+</span>
      `;
      row.addEventListener("click", () => {
        window.location.href = `add.html?program=${progIdx}&slot=${slotIdx}`;
      });
    }

    container.appendChild(row);
  });
}
