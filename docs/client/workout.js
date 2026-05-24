import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { addSignOutButton } from "../auth-helpers.js";

const params    = new URLSearchParams(window.location.search);
const programId = params.get("program");
const workoutId = params.get("workout");

document.getElementById("back-link").href = `program.html?id=${programId}`;

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../login.html"; return; }
  addSignOutButton();

  // Load workout data and saved weights in parallel
  const [workoutSnap, weightsSnap] = await Promise.all([
    getDoc(doc(db, "programs", programId, "workouts", workoutId)),
    getDoc(doc(db, "users", user.uid, "workoutWeights", `${programId}_${workoutId}`)),
  ]);

  if (!workoutSnap.exists()) {
    document.getElementById("workout-title").textContent = "Workout not found";
    return;
  }

  const workout = workoutSnap.data();
  // weights are keyed by "${weekIndex}_${exerciseIndex}"
  const weights = weightsSnap.exists() ? weightsSnap.data() : {};

  document.getElementById("workout-title").textContent = workout.title;

  if (workout.notes) {
    document.getElementById("workout-notes").textContent = workout.notes;
  } else {
    document.getElementById("workout-notes-section").style.display = "none";
  }

  // ── Weight persistence ─────────────────────────────────────────────────────
  const weightsRef = doc(db, "users", user.uid, "workoutWeights", `${programId}_${workoutId}`);

  async function saveWeight(weekIdx, exIdx, value) {
    weights[`${weekIdx}_${exIdx}`] = value;
    await setDoc(weightsRef, { [`${weekIdx}_${exIdx}`]: value }, { merge: true });
  }

  // ── Week tabs ──────────────────────────────────────────────────────────────
  let activeWeek = Math.max(
    0,
    Math.min(parseInt(params.get("week") || "0", 10), workout.weeks.length - 1)
  );

  const tabNav = document.getElementById("week-tabs");

  function renderTabs() {
    tabNav.innerHTML = "";
    workout.weeks.forEach((week, i) => {
      const btn = document.createElement("button");
      btn.className = "week-tab" + (i === activeWeek ? " active" : "");
      btn.innerHTML = `Week ${i + 1} <span class="tab-rpe">RPE ${week.rpe}</span>`;
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

  function openModal(exercise, exIdx) {
    document.getElementById("modal-number").textContent = exIdx + 1;
    document.getElementById("modal-name").textContent   = exercise.name;

    const notesSection = document.getElementById("modal-notes-section");
    const notesEl      = document.getElementById("modal-notes");
    if (exercise.note) {
      notesEl.textContent = exercise.note;
      notesSection.hidden = false;
    } else {
      notesSection.hidden = true;
    }

    document.getElementById("modal-prescription").innerHTML = `
      <span class="pill">${exercise.sets} sets</span>
      <span class="pill">${exercise.reps} reps</span>
    `;

    // Weights table across all weeks
    const weightsContainer = document.getElementById("modal-weights");
    weightsContainer.innerHTML = "";
    const table = document.createElement("table");
    table.className = "weights-table";
    table.innerHTML = `<thead><tr><th>Week</th><th>RPE</th><th>Weight</th></tr></thead>`;
    const tbody = document.createElement("tbody");

    workout.weeks.forEach((week, w) => {
      const saved = weights[`${w}_${exIdx}`] || "";
      const row   = document.createElement("tr");
      if (w === activeWeek) row.classList.add("active-week");
      row.innerHTML = `
        <td>Week ${w + 1}</td>
        <td>${week.rpe}</td>
        <td><input class="weight-table-input" type="text" placeholder="—" value="${saved}" /></td>
      `;
      const input = row.querySelector("input");
      input.addEventListener("blur", async (e) => {
        const val = e.target.value;
        await saveWeight(w, exIdx, val);
        if (w === activeWeek) {
          const cardInput = document.querySelector(
            `#exercise-list .exercise-card:nth-child(${exIdx + 1}) .weight-input`
          );
          if (cardInput) cardInput.value = val;
        }
      });
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    weightsContainer.appendChild(table);

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
    document.getElementById("total-sets").textContent      = totalSets;
    document.getElementById("est-time").textContent        = Math.round(totalSets * 2.5) + " min";

    const list = document.getElementById("exercise-list");
    list.innerHTML = "";

    exercises.forEach((exercise, exIdx) => {
      const savedWeight = weights[`${activeWeek}_${exIdx}`] || "";

      const card = document.createElement("div");
      card.className    = "exercise-card";
      card.style.cursor = "pointer";
      card.innerHTML = `
        <div class="exercise-header">
          <div class="exercise-number">${exIdx + 1}</div>
          <div class="exercise-info">
            <div class="exercise-name">${exercise.name}</div>
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
      weightInput.addEventListener("blur", async (e) => {
        await saveWeight(activeWeek, exIdx, e.target.value);
      });
      weightInput.addEventListener("click", (e) => e.stopPropagation());
      card.addEventListener("click", () => openModal(exercise, exIdx));
      list.appendChild(card);
    });
  }

  renderTabs();
  renderExercises();
});
