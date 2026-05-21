const list = document.getElementById("workout-list");

if (programs.length === 0) {
  list.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem;">No programs yet.</p>`;
} else {
  programs.forEach((program, idx) => {
    const workoutCount = program.workouts.filter(Boolean).length;

    const card = document.createElement("a");
    card.className = "workout-card";
    card.href = `program.html?idx=${idx}`;
    card.innerHTML = `
      <div class="workout-card-inner">
        <div class="workout-card-info">
          <div class="workout-card-title">${program.title}</div>
        </div>
        <div class="workout-card-meta">
          <span>${program.numWeeks} weeks</span>
          <span>${workoutCount} workouts</span>
          <span class="workout-card-arrow">→</span>
        </div>
      </div>
    `;
    list.appendChild(card);
  });
}
