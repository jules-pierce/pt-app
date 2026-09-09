// Shared exercise detail modal.
// Call setupExerciseModal() once to create the overlay; use the returned
// openModal / closeModal from any page.
export function setupExerciseModal({ videoSrc = "videos/video.MOV" } = {}) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <button class="em-close modal-close" aria-label="Close">✕</button>
      <div class="modal-header">
        <div class="exercise-number em-number"></div>
        <div class="exercise-info">
          <div class="exercise-name em-name"></div>
        </div>
      </div>
      <div class="modal-prescription em-prescription"></div>
      <div class="modal-section em-provider-notes-section">
        <label class="modal-label">Provider Notes</label>
        <p class="modal-notes em-provider-notes"></p>
      </div>
      <div class="modal-section">
        <label class="modal-label">Weights</label>
        <div class="em-weights"></div>
      </div>
      <div class="modal-section">
        <label class="modal-label">Video</label>
        <video class="modal-video" src="${videoSrc}" controls playsinline></video>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  overlay.querySelector(".em-close").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) {
      closeModal();
      e.stopImmediatePropagation();
    }
  });

  // openModal(exercise, exIdx, context)
  // context.onSaveWeight(w, exIdx, val) — omit for read-only
  // context.onSaveNote(w, exIdx, val)   — omit to hide client note UI
  // context.showClientNote              — show client notes read-only (provider view)
  // context.onToggleDone(week, exIdx)   — omit to hide Done button
  function openModal(exercise, exIdx, { workout, activeWeek, onSaveWeight, onSaveNote, showClientNote, onToggleDone } = {}) {
    const isDone = workout.exercises[exIdx]?.weeks?.[activeWeek]?.done || false;
    const units  = exercise.units || "lb";

    overlay.querySelector(".em-number").textContent = exIdx + 1;
    overlay.querySelector(".em-name").textContent   = exercise.name;

    const providerNotesSection = overlay.querySelector(".em-provider-notes-section");
    if (exercise.note) {
      overlay.querySelector(".em-provider-notes").textContent = exercise.note;
      providerNotesSection.hidden = false;
    } else {
      providerNotesSection.hidden = true;
    }

    const prescriptionEl = overlay.querySelector(".em-prescription");
    prescriptionEl.innerHTML = `
      <span class="pill">${exercise.sets} sets</span>
      <span class="pill">${exercise.reps} reps</span>
      ${onToggleDone ? `<button class="btn-done${isDone ? " is-done" : ""}" aria-label="${isDone ? "Mark as not done" : "Mark as done"}">${isDone ? "✓ Done" : "Done"}</button>` : ""}
    `;
    if (onToggleDone) {
      prescriptionEl.querySelector(".btn-done").addEventListener("click", async () => {
        await onToggleDone(activeWeek, exIdx);
        closeModal();
      });
    }

    const weightsContainer = overlay.querySelector(".em-weights");
    weightsContainer.innerHTML = "";
    const table = document.createElement("table");
    table.className = "weights-table";
    const hasNoteCol = !!onSaveNote || !!showClientNote;
    table.innerHTML = `<thead><tr>
      <th>Week</th><th>RPE</th><th>${units}</th>${hasNoteCol ? "<th></th>" : ""}
    </tr></thead>`;
    const tbody = document.createElement("tbody");

    workout.weeks.forEach((week, w) => {
      const saved     = workout.exercises[exIdx]?.weeks?.[w]?.weight || "";
      const savedNote = workout.exercises[exIdx]?.weeks?.[w]?.clientNote || "";
      const isActive  = w === activeWeek;

      const row = document.createElement("tr");
      if (isActive) row.classList.add("active-week");
      if (savedNote) row.classList.add("note-open");

      const suggestedHint = (w === 0 && exercise.suggestedWeight)
        ? `<div class="suggested-weight">Suggested start: ${exercise.suggestedWeight}</div>`
        : "";

      const weightCell = onSaveWeight
        ? `<input class="weight-table-input" type="text" placeholder="${units}" value="${saved}" />`
        : `<span>${saved || "—"}</span>`;

      // Note column: editable button for client, read-only button for provider (only when note exists)
      const noteBtn = onSaveNote
        ? `<button class="add-note-btn">${savedNote ? "hide note" : "show note"}</button>`
        : (savedNote ? `<button class="add-note-btn">show note</button>` : "");

      row.innerHTML = `
        <td>Week ${w + 1}</td>
        <td>${week.rpe}</td>
        <td>${weightCell}${suggestedHint}</td>
        ${hasNoteCol ? `<td>${noteBtn}</td>` : ""}
      `;

      let noteRow = null;
      if (hasNoteCol && (onSaveNote || savedNote)) {
        noteRow = document.createElement("tr");
        noteRow.className = "note-expand-row" + (isActive ? " active-week" : "");
        noteRow.hidden = !savedNote;

        if (onSaveNote) {
          noteRow.innerHTML = `<td colspan="4"><textarea class="note-row-textarea" rows="2" placeholder="Add a note for this week…"></textarea></td>`;
          noteRow.querySelector("textarea").value = savedNote;
          noteRow.querySelector("textarea").addEventListener("blur", async (e) => {
            await onSaveNote(w, exIdx, e.target.value);
          });
        } else {
          noteRow.innerHTML = `<td colspan="4"><p class="note-row-readonly">${savedNote}</p></td>`;
        }

        const noteBtn = row.querySelector(".add-note-btn");
        if (noteBtn) {
          noteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            noteRow.hidden = !noteRow.hidden;
            row.classList.toggle("note-open", !noteRow.hidden);
            e.target.textContent = noteRow.hidden ? "show note" : "hide note";
            if (!noteRow.hidden && onSaveNote) noteRow.querySelector("textarea").focus();
          });
        }
      }

      if (onSaveWeight) {
        row.querySelector("input").addEventListener("blur", async (e) => {
          await onSaveWeight(w, exIdx, e.target.value);
        });
      }

      tbody.appendChild(row);
      if (noteRow) tbody.appendChild(noteRow);
    });

    table.appendChild(tbody);
    weightsContainer.appendChild(table);

    overlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  return { openModal, closeModal };
}
