// Shared exercise × week table — used by the provider's workout "View" modal
// (read-only) and the client workout page (editable weight + done).
// Collapses a list of per-week values into "3" (all equal), "3-5" (numeric
// spread), or "3-5" using first/last order for non-numeric values (e.g. reps
// like "Max" or "60s").
function formatRange(values) {
  const unique = [...new Set(values)];
  if (unique.length <= 1) return unique[0] ?? "";

  const nums = unique.map(Number);
  if (nums.every((n) => !Number.isNaN(n))) {
    return `${Math.min(...nums)}-${Math.max(...nums)}`;
  }
  return `${values[0]}-${values[values.length - 1]}`;
}

export function renderExerciseTable(container, exercises, weeks, {
  editableWeight = false,
  showDone       = false,
  showWeekStatus = false,
  activeWeek     = null,
  onSaveWeight,   // (weekIdx, exIdx, value)
  onToggleDone,   // (weekIdx, exIdx)
  onRowClick,     // (exIdx)
} = {}) {
  exercises = exercises || [];
  weeks     = weeks || [];

  container.innerHTML = "";

  if (exercises.length === 0) {
    container.innerHTML = `<p class="empty-state">No exercises.</p>`;
    return;
  }

  const weekHeaders = weeks.map((w, i) => {
    const weekDone    = showWeekStatus && exercises.every((ex) => ex.weeks?.[i]?.done);
    const weekSkipped = showWeekStatus && !weekDone && !!w?.skipped;
    const classes = [
      "week-header",
      i === activeWeek ? "active-week" : "",
      weekDone    ? "week-header-done" : "",
      weekSkipped ? "week-header-skipped" : "",
    ].filter(Boolean).join(" ");
    return `<th class="${classes}">Wk ${i + 1}<small>RPE ${w.rpe}</small></th>`;
  }).join("");

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
      const weekData     = ex.weeks?.[w] || {};
      const weight       = weekData.weight || "";
      const hasNote      = !!weekData.clientNote;
      const isDone       = !!weekData.done;
      const weekSkipped  = !isDone && !!weeks[w]?.skipped;

      const classes = [
        hasNote ? "has-client-note" : "",
        isDone  ? "cell-done" : "",
        w === activeWeek ? "active-week" : "",
      ].filter(Boolean).join(" ");

      const weightEl = editableWeight
        ? `<input class="view-table-weight-input" type="text" placeholder="${units}" value="${weight}" data-week="${w}" />`
        : `<span${weekSkipped && !weight ? ' class="skipped-value"' : ""}>${weight || (weekSkipped ? "✕" : "—")}</span>`;

      const doneBtn = showDone
        ? `<button type="button" class="cell-done-btn${isDone ? " is-done" : weekSkipped ? " is-skipped" : ""}" data-week="${w}" aria-label="${isDone ? "Mark not done" : "Mark done"}">${isDone ? "✓" : weekSkipped ? "✕" : ""}</button>`
        : "";

      const prescriptionEl = ex.perWeekSetsReps
        ? `<div class="week-cell-prescription">${weekData.sets ?? ex.sets}×${weekData.reps ?? ex.reps}</div>`
        : "";
      const rpeEl = ex.rpeOverride
        ? `<div class="week-cell-prescription">RPE ${weekData.rpe ?? ""}</div>`
        : "";

      const valueEl = (prescriptionEl || rpeEl)
        ? `<div class="week-cell-value">${prescriptionEl}${rpeEl}${weightEl}</div>`
        : weightEl;

      const cellContent = `<div class="week-cell">${valueEl}${doneBtn}</div>`;

      return `<td class="${classes}">${cellContent}</td>`;
    }).join("");

    const setsCell = ex.perWeekSetsReps
      ? `<td class="range-cell">${formatRange(weeks.map((_, w) => ex.weeks?.[w]?.sets ?? ex.sets))}</td>`
      : `<td>${ex.sets}</td>`;
    const repsCell = ex.perWeekSetsReps
      ? `<td class="range-cell">${formatRange(weeks.map((_, w) => ex.weeks?.[w]?.reps ?? ex.reps))}</td>`
      : `<td>${ex.reps}</td>`;

    const row = document.createElement("tr");
    row.dataset.exIdx = idx;
    row.innerHTML = `${nameCell}${setsCell}${repsCell}<td>${units}</td>${weekCells}`;

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
