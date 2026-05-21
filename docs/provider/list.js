const programs = JSON.parse(localStorage.getItem("pt_programs") || "[]");
const container = document.getElementById("program-list");

if (programs.length === 0) {
  container.innerHTML = `<p class="empty-state">No programs yet.</p>`;
} else {
  programs.forEach((program, idx) => {
    const configured = program.workouts.filter(Boolean).length;

    const row = document.createElement("div");
    row.className = "saved-row saved-row--clickable";
    row.innerHTML = `
      <div class="saved-info">
        <div class="saved-title">${program.title || "Untitled"}</div>
        <div class="saved-meta">${program.numWeeks} weeks · ${configured}/${program.workouts.length} workouts configured</div>
      </div>
      <button class="btn-delete">Delete</button>
    `;

    row.addEventListener("click", () => {
      window.location.href = `program.html?idx=${idx}`;
    });

    row.querySelector(".btn-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      programs.splice(idx, 1);
      localStorage.setItem("pt_programs", JSON.stringify(programs));
      window.location.reload();
    });

    container.appendChild(row);
  });
}
