const workout = {
  title: "Upper Body Strength",
  date: "Monday, May 19 2026",
  notes: "Focus on controlled tempo — 3 seconds down on every rep. Rest 90 seconds between sets.",
  exercises: [
    { name: "Barbell Bench Press",   category: "Chest",             sets: 4, reps: 5,    weight: "225 lbs"    },
    { name: "Incline Dumbbell Press",category: "Chest / Shoulders", sets: 3, reps: 10,   weight: "65 lbs"     },
    { name: "Bent-Over Barbell Row", category: "Back",              sets: 4, reps: 8,    weight: "175 lbs"    },
    { name: "Pull-Ups",              category: "Back / Biceps",     sets: 3, reps: "Max",weight: "Bodyweight" },
    { name: "Overhead Press",        category: "Shoulders",         sets: 3, reps: 8,    weight: "115 lbs"    },
    { name: "Lateral Raises",        category: "Shoulders",         sets: 3, reps: 15,   weight: "20 lbs"     },
    { name: "Tricep Rope Pushdown",  category: "Triceps",           sets: 3, reps: 12,   weight: "60 lbs"     },
    { name: "EZ-Bar Curl",           category: "Biceps",            sets: 3, reps: 10,   weight: "75 lbs"     },
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

const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets, 0);
document.getElementById("total-exercises").textContent = workout.exercises.length;
document.getElementById("total-sets").textContent = totalSets;
document.getElementById("est-time").textContent = Math.round(totalSets * 2.5) + " min";

const list = document.getElementById("exercise-list");

workout.exercises.forEach((exercise, idx) => {
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
