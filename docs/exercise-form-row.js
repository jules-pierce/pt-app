// Shared exercise-row builder for the provider's Add and Edit workout forms.
// addExerciseRow() appends one exercise card to `container`, with an
// optional per-week sets/reps section. readExerciseRow() extracts its
// values on submit.
export function addExerciseRow(container, ex, overriding, { getDefaultSets, numWeeks }) {
  const perWeek = !!ex.perWeekSetsReps;
  const setsVal = overriding ? (ex.sets ?? "") : (getDefaultSets() ?? "");

  const card = document.createElement("div");
  card.className = "exercise-row exercise-card-form";
  card.innerHTML = `
    <div class="exercise-card-form-header">
      <input class="form-input ex-name" type="text" placeholder="Exercise name" value="${ex.name || ""}" required />
      <button type="button" class="btn-remove" aria-label="Remove exercise">✕</button>
    </div>
    <div class="exercise-card-form-fields">
      <div class="exercise-card-form-field">
        <label class="form-label">Units</label>
        <select class="form-input ex-units">
          <option value="lb" ${(ex.units || "lb") === "lb" ? "selected" : ""}>lb</option>
          <option value="kg" ${ex.units === "kg" ? "selected" : ""}>kg</option>
          <option value="reps" ${ex.units === "reps" ? "selected" : ""}>reps</option>
        </select>
      </div>
      <div class="exercise-card-form-field ex-sets-field" ${perWeek ? "hidden" : ""}>
        <div class="form-label-row">
          <label class="form-label">Sets</label>
          <button type="button" class="btn-sets-toggle">${overriding ? "Use default" : "Override"}</button>
        </div>
        <input class="form-input ex-sets" type="number" min="1" value="${setsVal}" ${overriding ? "" : "disabled"} />
      </div>
      <div class="exercise-card-form-field ex-reps-field" ${perWeek ? "hidden" : ""}>
        <label class="form-label">Reps</label>
        <input class="form-input ex-reps" type="text" placeholder="e.g. 8" value="${ex.reps || ""}" ${perWeek ? "" : "required"} />
      </div>
      <div class="exercise-card-form-field">
        <label class="form-label">Start wt.</label>
        <input class="form-input ex-suggested-weight" type="text" placeholder="e.g. 135 lb" value="${ex.suggestedWeight || ""}" />
      </div>
    </div>
    <button type="button" class="btn-per-week" ${perWeek ? "hidden" : ""}>+ Add sets &amp; reps per week</button>
    <div class="per-week-rows" ${perWeek ? "" : "hidden"}></div>
    <input class="form-input ex-note" type="text" placeholder="Note (optional)" value="${ex.note || ""}" />
  `;

  const setsField   = card.querySelector(".ex-sets-field");
  const repsField   = card.querySelector(".ex-reps-field");
  const setsInput   = card.querySelector(".ex-sets");
  const repsInput   = card.querySelector(".ex-reps");
  const toggleBtn   = card.querySelector(".btn-sets-toggle");
  const perWeekBtn  = card.querySelector(".btn-per-week");
  const perWeekRows = card.querySelector(".per-week-rows");

  toggleBtn.addEventListener("click", () => {
    if (setsInput.disabled) {
      setsInput.disabled = false;
      setsInput.focus();
      toggleBtn.textContent = "Use default";
    } else {
      setsInput.disabled = true;
      setsInput.value = getDefaultSets() ?? "";
      toggleBtn.textContent = "Override";
    }
  });

  function renderPerWeekRows(weeklySets, weeklyReps) {
    perWeekRows.innerHTML = `
      <div class="per-week-rows-header">
        <span class="form-label">Per-week sets &amp; reps</span>
        <button type="button" class="btn-per-week-remove">Use one value for all weeks</button>
      </div>
      ${Array.from({ length: numWeeks }, (_, w) => `
        <div class="per-week-row">
          <span class="per-week-row-label">Wk ${w + 1}</span>
          <input class="form-input pw-sets" type="number" min="1" placeholder="Sets" value="${weeklySets[w] ?? ""}" required />
          <input class="form-input pw-reps" type="text" placeholder="Reps" value="${weeklyReps[w] ?? ""}" required />
        </div>
      `).join("")}
    `;
    perWeekRows.querySelector(".btn-per-week-remove").addEventListener("click", () => {
      const firstSets = perWeekRows.querySelector(".pw-sets")?.value || "";
      const firstReps = perWeekRows.querySelector(".pw-reps")?.value || "";
      perWeekRows.hidden   = true;
      perWeekRows.innerHTML = "";
      setsField.hidden  = false;
      repsField.hidden  = false;
      repsInput.required = true;
      perWeekBtn.hidden = false;
      setsInput.disabled = false;
      setsInput.value    = firstSets;
      toggleBtn.textContent = "Use default";
      repsInput.value = firstReps;
    });
  }

  perWeekBtn.addEventListener("click", () => {
    const weeklySets = Array.from({ length: numWeeks }, () => setsInput.value || getDefaultSets() || "");
    const weeklyReps = Array.from({ length: numWeeks }, () => repsInput.value || "");
    renderPerWeekRows(weeklySets, weeklyReps);
    setsField.hidden    = true;
    repsField.hidden    = true;
    repsInput.required  = false;
    perWeekBtn.hidden    = true;
    perWeekRows.hidden   = false;
  });

  if (perWeek) {
    const weeklySets = Array.from({ length: numWeeks }, (_, w) => ex.weeks?.[w]?.sets ?? "");
    const weeklyReps = Array.from({ length: numWeeks }, (_, w) => ex.weeks?.[w]?.reps ?? "");
    renderPerWeekRows(weeklySets, weeklyReps);
  }

  card.querySelector(".btn-remove").addEventListener("click", () => card.remove());
  container.appendChild(card);
  return card;
}

// Reads one exercise row back into a plain exercise object (minus `weeks`,
// which the caller assembles since it may need to preserve existing weight
// data on edit).
export function readExerciseRow(row, defaultSets) {
  const setsInput       = row.querySelector(".ex-sets");
  const setsOverride    = !setsInput.disabled;
  const perWeekRows     = row.querySelector(".per-week-rows");
  const perWeekSetsReps = !perWeekRows.hidden && perWeekRows.children.length > 0;

  const weeklySets = perWeekSetsReps
    ? [...row.querySelectorAll(".pw-sets")].map((i) => parseInt(i.value, 10))
    : null;
  const weeklyReps = perWeekSetsReps
    ? [...row.querySelectorAll(".pw-reps")].map((i) => i.value.trim())
    : null;

  const sets = perWeekSetsReps ? weeklySets[0] : (setsOverride ? parseInt(setsInput.value, 10) : defaultSets);
  const reps = perWeekSetsReps ? weeklyReps[0] : row.querySelector(".ex-reps").value.trim();

  return {
    name:            row.querySelector(".ex-name").value.trim(),
    sets,
    reps,
    units:           row.querySelector(".ex-units").value,
    note:            row.querySelector(".ex-note").value.trim(),
    suggestedWeight: row.querySelector(".ex-suggested-weight").value.trim(),
    setsOverride:    perWeekSetsReps ? false : setsOverride,
    perWeekSetsReps,
    weeklySets,
    weeklyReps,
  };
}

// Wires up one exercise section (core / warmup / cooldown) of a workout
// form: its default-sets input plus its container of exercise rows. Used by
// the add and edit workout forms, one instance per section.
export function createExerciseSection(rowsContainer, defaultSetsInput, getNumWeeks) {
  function getDefaultSets() {
    return parseInt(defaultSetsInput.value, 10) || null;
  }

  defaultSetsInput.addEventListener("input", () => {
    const val = getDefaultSets();
    rowsContainer.querySelectorAll(".exercise-row").forEach((row) => {
      const input = row.querySelector(".ex-sets");
      if (input.disabled) input.value = val ?? "";
    });
  });

  function addRow(ex = {}, overriding = false) {
    return addExerciseRow(rowsContainer, ex, overriding, { getDefaultSets, numWeeks: getNumWeeks() });
  }

  function readRows() {
    const defaultSets = getDefaultSets();
    return [...rowsContainer.querySelectorAll(".exercise-row")].map((row) => readExerciseRow(row, defaultSets));
  }

  function clear() {
    rowsContainer.innerHTML = "";
  }

  return { getDefaultSets, addRow, readRows, clear };
}

// Wires up a collapsed-by-default section: a placeholder button that, when
// clicked, hides itself and reveals the section's box (e.g. "+ Add Warmup").
// Used for the optional warmup/cooldown sections on the workout forms.
export function createCollapsibleSection(toggleBtn, boxEl) {
  function expand() {
    toggleBtn.hidden = true;
    boxEl.hidden = false;
  }
  function collapse() {
    toggleBtn.hidden = false;
    boxEl.hidden = true;
  }
  toggleBtn.addEventListener("click", expand);
  return { expand, collapse };
}

// Turns raw readExerciseRow() results into stored exercise objects with a
// `weeks` array. `oldExercises` (same section, previous save) is matched by
// index to preserve existing per-week weight/done/clientNote on edit; omit
// it when creating a new workout.
export function buildExercisesWithWeeks(rawExercises, numWeeks, oldExercises) {
  return rawExercises.map(({ weeklySets, weeklyReps, ...ex }, i) => {
    const oldWeeks = oldExercises?.[i]?.weeks;
    return {
      ...ex,
      weeks: Array.from({ length: numWeeks }, (_, w) => {
        const base = oldWeeks?.[w] ?? { weight: "" };
        if (ex.perWeekSetsReps) return { ...base, sets: weeklySets[w], reps: weeklyReps[w] };
        const { sets, reps, ...rest } = base;
        return rest;
      }),
    };
  });
}
