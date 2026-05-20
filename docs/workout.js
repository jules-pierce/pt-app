// ── Load workout by ?id= and ?week= params ───────────────────────────────────
const params = new URLSearchParams(window.location.search);
const id = parseInt(params.get("id"), 10);
const workout = workouts[id];

if (!workout) {
  document.getElementById("workout-title").textContent = "Workout not found";
} else {
  document.getElementById("workout-title").textContent = workout.title;
  document.getElementById("workout-meta").textContent = workout.date;

  if (workout.notes) {
    document.getElementById("workout-notes").textContent = workout.notes;
  } else {
    document.getElementById("workout-notes-section").style.display = "none";
  }

  // ── Week tabs ──────────────────────────────────────────────────────────────
  let activeWeek = Math.max(0, Math.min(parseInt(params.get("week") || "0", 10), workout.weeks.length - 1));

  const tabNav = document.getElementById("week-tabs");

  function renderTabs() {
    tabNav.innerHTML = "";
    workout.weeks.forEach((_, i) => {
      const btn = document.createElement("button");
      btn.className = "week-tab" + (i === activeWeek ? " active" : "");
      btn.textContent = `Week ${i + 1}`;
      btn.addEventListener("click", () => {
        activeWeek = i;
        const url = new URL(window.location);
        url.searchParams.set("week", i);
        history.replaceState(null, "", url);
        renderTabs();
        renderExercises();
      });
      tabNav.appendChild(btn);
    });
  }

  // ── Exercises ──────────────────────────────────────────────────────────────
  function renderExercises() {
    const exercises = workout.weeks[activeWeek].exercises;
    const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0);

    document.getElementById("total-exercises").textContent = exercises.length;
    document.getElementById("total-sets").textContent = totalSets;
    document.getElementById("est-time").textContent = Math.round(totalSets * 2.5) + " min";

    const list = document.getElementById("exercise-list");
    list.innerHTML = "";

    exercises.forEach((exercise, idx) => {
      const card = document.createElement("div");
      card.className = "exercise-card";
      card.innerHTML = `
        <div class="exercise-header">
          <div class="exercise-number">${idx + 1}</div>
          <div class="exercise-info">
            <div class="exercise-name">${exercise.name}</div>
            <div class="exercise-category">${exercise.category}</div>
          </div>
          <div class="exercise-prescription">
            <span class="pill">${exercise.sets} sets</span>
            <span class="pill">${exercise.reps} reps</span>
            <span class="pill weight">${exercise.weight}</span>
          </div>
        </div>
      `;
      list.appendChild(card);
    });
  }

  renderTabs();
  renderExercises();
}
