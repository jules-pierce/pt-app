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
      btn.innerHTML = `Week ${i + 1} <span class="tab-rpe">RPE ${workout.weeks[i].rpe}</span>`;
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

  // ── Modal ──────────────────────────────────────────────────────────────────
  const overlay    = document.getElementById("modal-overlay");
  const modalClose = document.getElementById("modal-close");


  function openModal(exercise, idx) {
    const weightKey = `pt_weight_${id}_w${activeWeek}_e${idx}`;

    document.getElementById("modal-number").textContent   = idx + 1;
    document.getElementById("modal-name").textContent     = exercise.name;
    document.getElementById("modal-category").textContent = exercise.category;

    const savedWeight = localStorage.getItem(weightKey) || "";
    document.getElementById("modal-prescription").innerHTML = `
      <span class="pill">${exercise.sets} sets</span>
      <span class="pill">${exercise.reps} reps</span>
      <input class="pill weight-input" type="text" placeholder="weight" value="${savedWeight}" aria-label="Weight" />
    `;

    // Keep modal weight in sync with the card
    const modalWeightInput = document.getElementById("modal-prescription").querySelector(".weight-input");
    modalWeightInput.addEventListener("input", (e) => {
      localStorage.setItem(weightKey, e.target.value);
      const cardInput = document.querySelector(`#exercise-list .exercise-card:nth-child(${idx + 1}) .weight-input`);
      if (cardInput) cardInput.value = e.target.value;
    });


    overlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  modalClose.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

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
      const weightKey = `pt_weight_${id}_w${activeWeek}_e${idx}`;
      const savedWeight = localStorage.getItem(weightKey) || "";

      const card = document.createElement("div");
      card.className = "exercise-card";
      card.style.cursor = "pointer";
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
            <input
              class="pill weight-input"
              type="text"
              placeholder="weight"
              value="${savedWeight}"
              aria-label="Weight for ${exercise.name}"
            />
          </div>
        </div>
      `;

      const weightInput = card.querySelector(".weight-input");
      weightInput.addEventListener("input", (e) => {
        localStorage.setItem(weightKey, e.target.value);
      });
      // Don't open modal when interacting with the weight input
      weightInput.addEventListener("click", (e) => e.stopPropagation());

      card.addEventListener("click", () => openModal(exercise, idx));
      list.appendChild(card);
    });
  }

  renderTabs();
  renderExercises();
}
