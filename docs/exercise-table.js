// Shared exercise × week table — used by the provider's workout "View" modal
// (read-only) and the client workout page (editable weight + done).
export function renderExerciseTable(container, workout, {
  editableWeight = false,
  showDone       = false,
  activeWeek     = null,
  onSaveWeight,   // (weekIdx, exIdx, value)
  onToggleDone,   // (weekIdx, exIdx)
  onRowClick,     // (exIdx)
} = {}) {
  const exercises = workout.exercises || [];
  const weeks     = workout.weeks || [];

  container.innerHTML = "";

  if (exercises.length === 0) {
    container.innerHTML = `<p class="empty-state">No exercises.</p>`;
    return;
  }

  const weekHeaders = weeks.map((w, i) =>
    `<th class="${i === activeWeek ? "active-week" : ""}">Wk ${i + 1}<small>RPE ${w.rpe}</small></th>`
  ).join("");

  const table = document.createElement("table");
  table.className = "view-table";
  table.innerHTML = `<thead><tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>Units</th>${weekHeaders}</tr></thead>`;

  const tbody = document.createElement("tbody");

  exercises.forEach((ex, idx) => {
    const units = ex.units || "lb";
    const nameCell = ex.note
      ? `<td>${ex.name}<div class="ex-note-inline">${ex.note}</div></td>`
      : `<td>${ex.name}</td>`;

    const weekCells = weeks.map((_, w) => {
      const weekData = ex.weeks?.[w] || {};
      const weight   = weekData.weight || "";
      const hasNote  = !!weekData.clientNote;
      const isDone   = !!weekData.done;

      const classes = [
        hasNote ? "has-client-note" : "",
        isDone  ? "cell-done" : "",
        w === activeWeek ? "active-week" : "",
      ].filter(Boolean).join(" ");

      const weightEl = editableWeight
        ? `<input class="view-table-weight-input" type="text" placeholder="${units}" value="${weight}" data-week="${w}" />`
        : `<span>${weight || "—"}</span>`;

      const doneBtn = showDone
        ? `<button type="button" class="cell-done-btn${isDone ? " is-done" : ""}" data-week="${w}" aria-label="${isDone ? "Mark not done" : "Mark done"}">${isDone ? "✓" : ""}</button>`
        : "";

      return `<td class="${classes}"><div class="week-cell">${weightEl}${doneBtn}</div></td>`;
    }).join("");

    const row = document.createElement("tr");
    row.dataset.exIdx = idx;
    row.innerHTML = `${nameCell}<td>${ex.sets}</td><td>${ex.reps}</td><td>${units}</td>${weekCells}`;

    if (editableWeight) {
      row.querySelectorAll(".view-table-weight-input").forEach((input) => {
        input.addEventListener("click", (e) => e.stopPropagation());
        input.addEventListener("blur", async (e) => {
          const w = parseInt(e.target.dataset.week, 10);
          await onSaveWeight?.(w, idx, e.target.value);
        });
      });
    }

    if (showDone) {
      row.querySelectorAll(".cell-done-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const w = parseInt(btn.dataset.week, 10);
          await onToggleDone?.(w, idx);
        });
      });
    }

    if (onRowClick) {
      row.style.cursor = "pointer";
      row.addEventListener("click", () => onRowClick(idx));
    }

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}
