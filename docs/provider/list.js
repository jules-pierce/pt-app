const customWorkouts = JSON.parse(localStorage.getItem("pt_custom_workouts") || "[]");
const hardcodedCount = workouts.length - customWorkouts.length;

const container = document.getElementById("workout-list");

if (workouts.length === 0) {
  container.innerHTML = `<p class="empty-state">No workouts yet.</p>`;
} else {
  workouts.forEach((workout, idx) => {
    const isCustom = idx >= hardcodedCount;
    const customIdx = idx - hardcodedCount;

    const row = document.createElement("div");
    row.className = "saved-row";
    row.innerHTML = `
      <div class="saved-info">
        <div class="saved-title">${workout.title || "Untitled"}</div>
        <div class="saved-meta">${workout.date || "—"} · ${workout.weeks[0].exercises.length} exercises</div>
      </div>
      ${isCustom ? `<button class="btn-delete" data-idx="${customIdx}">Delete</button>` : ""}
    `;

    if (isCustom) {
      row.querySelector(".btn-delete").addEventListener("click", () => {
        const custom = JSON.parse(localStorage.getItem("pt_custom_workouts") || "[]");
        custom.splice(customIdx, 1);
        localStorage.setItem("pt_custom_workouts", JSON.stringify(custom));
        window.location.reload();
      });
    }

    container.appendChild(row);
  });
}
