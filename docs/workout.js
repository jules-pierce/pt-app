const workout = {
  title: "Upper Body Strength",
  date: "Monday, May 19 2026",
  notes: "Focus on controlled tempo — 3 seconds down on every rep. Rest 90 seconds between sets.",
  exercises: [
    {
      name: "Barbell Bench Press",
      category: "Chest",
      sets: [
        { reps: 5, weight: "135 lbs", note: "Warm-up" },
        { reps: 5, weight: "185 lbs" },
        { reps: 5, weight: "205 lbs" },
        { reps: 5, weight: "225 lbs" },
        { reps: "AMRAP", weight: "205 lbs", note: "Drop set" },
      ],
    },
    {
      name: "Incline Dumbbell Press",
      category: "Chest / Shoulders",
      sets: [
        { reps: 10, weight: "60 lbs" },
        { reps: 10, weight: "65 lbs" },
        { reps: 8, weight: "70 lbs" },
      ],
    },
    {
      name: "Bent-Over Barbell Row",
      category: "Back",
      sets: [
        { reps: 8, weight: "135 lbs" },
        { reps: 8, weight: "155 lbs" },
        { reps: 8, weight: "175 lbs" },
        { reps: 6, weight: "185 lbs" },
      ],
    },
    {
      name: "Pull-Ups",
      category: "Back / Biceps",
      sets: [
        { reps: "Max", weight: "Bodyweight" },
        { reps: "Max", weight: "Bodyweight" },
        { reps: "Max", weight: "Bodyweight" },
      ],
    },
    {
      name: "Overhead Press",
      category: "Shoulders",
      sets: [
        { reps: 8, weight: "95 lbs" },
        { reps: 8, weight: "115 lbs" },
        { reps: 6, weight: "125 lbs" },
      ],
    },
    {
      name: "Lateral Raises",
      category: "Shoulders",
      sets: [
        { reps: 15, weight: "20 lbs" },
        { reps: 15, weight: "20 lbs" },
        { reps: 12, weight: "25 lbs" },
      ],
    },
    {
      name: "Tricep Rope Pushdown",
      category: "Triceps",
      sets: [
        { reps: 12, weight: "50 lbs" },
        { reps: 12, weight: "60 lbs" },
        { reps: 10, weight: "70 lbs" },
      ],
    },
    {
      name: "EZ-Bar Curl",
      category: "Biceps",
      sets: [
        { reps: 12, weight: "65 lbs" },
        { reps: 10, weight: "75 lbs" },
        { reps: 8, weight: "85 lbs" },
      ],
    },
  ],
};

// ── Render ──────────────────────────────────────────────────────────────────

document.getElementById("workout-title").textContent = workout.title;
document.getElementById("workout-meta").textContent = workout.date;

if (workout.notes) {
  document.getElementById("workout-notes").textContent = workout.notes;
} else {
  document.getElementById("workout-notes-section").style.display = "none";
}

const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
document.getElementById("total-exercises").textContent = workout.exercises.length;
document.getElementById("total-sets").textContent = totalSets;
document.getElementById("est-time").textContent = Math.round(totalSets * 2.5) + " min";

const list = document.getElementById("exercise-list");

workout.exercises.forEach((exercise, idx) => {
  const card = document.createElement("div");
  card.className = "exercise-card";

  const header = document.createElement("div");
  header.className = "exercise-header";
  header.innerHTML = `
    <div class="exercise-number">${idx + 1}</div>
    <div>
      <div class="exercise-name">${exercise.name}</div>
      <div class="exercise-category">${exercise.category}</div>
    </div>
  `;

  const table = document.createElement("table");
  table.className = "sets-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Set</th>
        <th>Reps</th>
        <th>Weight</th>
        <th>Note</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement("tbody");
  exercise.sets.forEach((set, setIdx) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${setIdx + 1}</td>
      <td>${set.reps}</td>
      <td>${set.weight}</td>
      <td class="note-cell">${set.note || ""}</td>
    `;
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  card.appendChild(header);
  card.appendChild(table);
  list.appendChild(card);
});
