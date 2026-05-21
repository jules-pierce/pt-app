const list = document.getElementById("workout-list");

workouts.forEach((workout, idx) => {
  const totalSets = workout.weeks[0].exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const estTime = Math.round(totalSets * 2.5);

  const card = document.createElement("a");
  card.className = "workout-card";
  card.href = `workout.html?id=${idx}`;
  card.innerHTML = `
    <div class="workout-card-inner">
      <div class="workout-card-info">
        <div class="workout-card-title">${workout.title}</div>
        <div class="workout-card-date">${workout.date}</div>
      </div>
      <div class="workout-card-meta">
        <span>${workout.weeks[0].exercises.length} exercises</span>
        <span>${totalSets} sets</span>
        <span>~${estTime} min</span>
        <span class="workout-card-arrow">→</span>
      </div>
    </div>
  `;
  list.appendChild(card);
});
