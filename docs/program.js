import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { addSignOutButton } from "./auth-helpers.js";
import { setupExerciseModal } from "./exercise-modal.js";
import { renderExerciseTable } from "./exercise-table.js";
import { createExerciseSection, buildExercisesWithWeeks, createCollapsibleSection } from "./exercise-form-row.js";
import { isWeekDone, isWeekSkipped, isWeekComplete, nextIncompleteWeek, isWorkoutComplete, isProgramDone, workoutExerciseCount, workoutSetCount } from "./workout-status.js";

const params    = new URLSearchParams(window.location.search);
const programId = params.get("id");

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../login.html"; return; }
  addSignOutButton();

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const role     = userSnap.exists() ? userSnap.data().role : null;

  document.getElementById("role-label").textContent =
    role === "provider" ? "Provider" : "Training Plan";

  const programSnap = await getDoc(doc(db, "programs", programId));
  if (!programSnap.exists()) {
    document.querySelector("main").innerHTML = `<p class="empty-state">Program not found.</p>`;
    return;
  }

  const program = programSnap.data();

  if (role === "provider" && program.providerId !== user.uid) {
    window.location.href = "index.html"; return;
  }
  if (role === "client" && program.clientId !== user.uid) {
    window.location.href = "index.html"; return;
  }

  document.getElementById("program-title").textContent = program.title;
  document.getElementById("program-meta").textContent  =
    `${program.numWeeks} weeks · ${program.workoutSlots.length} workouts`;

  const slots = program.workoutSlots || [];

  const workoutDocs = {};
  await Promise.all(
    slots.filter(Boolean).map(async (wId) => {
      const snap = await getDoc(doc(db, "programs", programId, "workouts", wId));
      if (snap.exists()) workoutDocs[wId] = snap.data();
    })
  );

  const container = document.getElementById("workout-slots");

  let refreshList = () => {};

  if (role === "provider") {
    refreshList = renderProvider();
  } else {
    renderClient();
    refreshList = renderClient;
  }

  // ── Program-level done button ───────────────────────────────────────────────
  const programDoneBtn = document.getElementById("program-done-btn");

  function renderProgramDoneButton() {
    const complete = isProgramDone(slots, workoutDocs);
    programDoneBtn.textContent = complete ? "✓ Program Done" : "Mark Program Done";
    programDoneBtn.classList.toggle("is-complete", complete);
  }

  programDoneBtn.addEventListener("click", async () => {
    const target = !isProgramDone(slots, workoutDocs);
    const workouts = slots
      .map((workoutId) => ({ workoutId, workout: workoutId ? workoutDocs[workoutId] : null }))
      .filter((item) => item.workout);

    const batch = writeBatch(db);
    workouts.forEach(({ workoutId, workout }) => {
      const update = {};
      ["warmupExercises", "exercises", "cooldownExercises"].forEach((key) => {
        (workout[key] || []).forEach((ex) => ex.weeks.forEach((w) => { w.done = target; }));
        if (workout[key]) update[key] = workout[key];
      });
      batch.update(doc(db, "programs", programId, "workouts", workoutId), update);
    });

    programDoneBtn.disabled = true;
    await batch.commit();
    programDoneBtn.disabled = false;
    renderProgramDoneButton();
    refreshList();
  });

  renderProgramDoneButton();

  // ── Client rendering ─────────────────────────────────────────────────────────
  function firstNotDoneWeek(workout) {
    const numWeeks = workout.weeks?.length ?? 0;
    for (let w = 0; w < numWeeks; w++) {
      if (!isWeekComplete(workout, w)) return w;
    }
    return 0;
  }

  function notDoneWeekCount(workout) {
    const numWeeks = workout.weeks?.length ?? 0;
    let count = 0;
    for (let w = 0; w < numWeeks; w++) {
      if (!isWeekComplete(workout, w)) count++;
    }
    return count;
  }

  function renderClient() {
    const configured = slots.filter(Boolean);
    if (configured.length === 0) {
      container.innerHTML = `<p class="empty-state">No workouts configured yet.</p>`;
      return;
    }

    const items = slots
      .map((workoutId, slotIdx) => ({ workoutId, slotIdx, workout: workoutDocs[workoutId] }))
      .filter(item => item.workoutId && item.workout)
      .sort((a, b) => notDoneWeekCount(b.workout) - notDoneWeekCount(a.workout));

    items.forEach(({ workoutId, slotIdx, workout }) => {
      const row = document.createElement("div");
      row.className = "saved-row saved-row--clickable";
      if (isWorkoutComplete(workout)) row.classList.add("saved-row--done");
      row.innerHTML = `
        <div class="saved-info">
          <div class="slot-label">Workout ${slotIdx + 1}</div>
          <div class="saved-title">${workout.title || "Untitled"}</div>
          <div class="saved-meta">${workoutExerciseCount(workout)} exercise${workoutExerciseCount(workout) !== 1 ? "s" : ""}</div>
        </div>
        <span class="slot-arrow">→</span>
      `;
      row.addEventListener("click", () => {
        const week = firstNotDoneWeek(workout);
        window.location.href = `workout.html?program=${programId}&workout=${workoutId}&week=${week}`;
      });
      container.appendChild(row);
    });
  }

  // ── Provider rendering ───────────────────────────────────────────────────────
  function renderProvider() {
    // Set up exercise detail modal first so its ESC handler takes priority
    const exModal = setupExerciseModal({ videoSrc: "../client/videos/video.MOV" });

    // View modal
    const viewOverlay = document.getElementById("view-modal-overlay");

    const viewSections = [
      { key: "warmupExercises",   sectionEl: document.getElementById("view-modal-warmup-section"),   bodyEl: document.getElementById("view-modal-warmup-body") },
      { key: "exercises",         sectionEl: null,                                                    bodyEl: document.getElementById("view-modal-body") },
      { key: "cooldownExercises", sectionEl: document.getElementById("view-modal-cooldown-section"),  bodyEl: document.getElementById("view-modal-cooldown-body") },
    ];

    function openViewModal(workout, workoutId) {
      document.getElementById("view-modal-title").textContent = workout.title || "Untitled";

      const pillsEl = document.getElementById("view-modal-pills");

      function renderBody() {
        viewSections.forEach(({ key, sectionEl, bodyEl }) => {
          const exercises = workout[key] || [];
          if (sectionEl) sectionEl.hidden = exercises.length === 0;
          renderExerciseTable(bodyEl, exercises, workout.weeks, {
            showWeekStatus: true,
            onRowClick: (idx) => {
              exModal.openModal(exercises[idx], idx, { exercises, weeks: workout.weeks, activeWeek: 0, showClientNote: true });
            },
          });
        });
      }

      function renderPills() {
        const weekIdx   = nextIncompleteWeek(workout);
        const weekLabel = `Week ${weekIdx + 1}`;
        const done      = isWeekDone(workout, weekIdx);
        const skipped   = isWeekSkipped(workout, weekIdx);
        pillsEl.innerHTML = `
          <span class="pill">${workoutExerciseCount(workout)} exercise${workoutExerciseCount(workout) !== 1 ? "s" : ""}</span>
          <span class="pill">${workoutSetCount(workout)} sets</span>
          <button type="button" class="pill pill-done-btn${done ? " is-complete" : ""}"${skipped ? " hidden" : ""}>${done ? `✓ ${weekLabel} Done` : `Mark ${weekLabel} Done`}</button>
          <button type="button" class="pill pill-skip-btn${skipped ? " is-skipped" : ""}"${done ? " hidden" : ""}>${skipped ? `✓ ${weekLabel} Skipped` : `Skip ${weekLabel}`}</button>
        `;
        pillsEl.querySelector(".pill-done-btn").addEventListener("click", async (e) => {
          const target = !isWeekDone(workout, weekIdx);
          const update = {};
          ["warmupExercises", "exercises", "cooldownExercises"].forEach((key) => {
            (workout[key] || []).forEach((ex) => { if (ex.weeks[weekIdx]) ex.weeks[weekIdx].done = target; });
            if (workout[key]) update[key] = workout[key];
          });
          if (target && workout.weeks[weekIdx]?.skipped) {
            workout.weeks[weekIdx].skipped = false;
            update.weeks = workout.weeks;
          }
          e.target.disabled = true;
          await updateDoc(doc(db, "programs", programId, "workouts", workoutId), update);
          e.target.disabled = false;
          renderPills();
          renderBody();
          renderSlots();
          renderProgramDoneButton();
        });
        pillsEl.querySelector(".pill-skip-btn").addEventListener("click", async (e) => {
          workout.weeks[weekIdx] = { ...(workout.weeks[weekIdx] || {}), skipped: !workout.weeks[weekIdx]?.skipped };
          e.target.disabled = true;
          await updateDoc(doc(db, "programs", programId, "workouts", workoutId), { weeks: workout.weeks });
          e.target.disabled = false;
          renderPills();
          renderSlots();
          renderProgramDoneButton();
        });
      }

      renderPills();
      renderBody();

      viewOverlay.hidden = false;
    }

    document.getElementById("view-modal-close").addEventListener("click", () => { viewOverlay.hidden = true; });
    viewOverlay.addEventListener("click", (e) => { if (e.target === viewOverlay) viewOverlay.hidden = true; });

    // Edit modal
    const editOverlay = document.getElementById("edit-modal-overlay");
    const editForm     = document.getElementById("edit-modal-form");

    let activeWorkoutId = null;
    let activeWorkout   = null;

    const getEditNumWeeks = () => activeWorkout?.weeks?.length ?? program.numWeeks;

    const editRpeRows = document.getElementById("edit-rpe-rows");
    const getEditWeeklyRpe = () => [...editRpeRows.querySelectorAll(".rpe-input")].map((input) => parseFloat(input.value));

    const editWarmupSection = createExerciseSection(
      document.getElementById("edit-warmup-exercise-rows"), document.getElementById("edit-warmup-default-sets"), getEditNumWeeks, getEditWeeklyRpe
    );
    const editCoreSection = createExerciseSection(
      document.getElementById("edit-exercise-rows"), document.getElementById("edit-default-sets"), getEditNumWeeks, getEditWeeklyRpe
    );
    const editCooldownSection = createExerciseSection(
      document.getElementById("edit-cooldown-exercise-rows"), document.getElementById("edit-cooldown-default-sets"), getEditNumWeeks, getEditWeeklyRpe
    );

    const editWarmupToggle   = createCollapsibleSection(document.getElementById("edit-show-warmup-btn"), document.getElementById("edit-warmup-box"));
    const editCooldownToggle = createCollapsibleSection(document.getElementById("edit-show-cooldown-btn"), document.getElementById("edit-cooldown-box"));

    function renderEditRpeRows(weeks) {
      editRpeRows.innerHTML = weeks.map((week, w) => `
        <div class="per-week-row rpe-row">
          <span class="per-week-row-label">Wk ${w + 1}</span>
          <input class="form-input rpe-input" type="number" min="1" max="10" step="0.5" value="${week.rpe ?? ""}" required />
        </div>
      `).join("");
    }

    // Opening a section from its placeholder button starts it with one
    // exercise row already in place, rather than an empty list.
    document.getElementById("edit-show-warmup-btn").addEventListener("click", () => editWarmupSection.addRow());
    document.getElementById("edit-show-cooldown-btn").addEventListener("click", () => editCooldownSection.addRow());

    function openEditModal(workout, workoutId) {
      activeWorkoutId = workoutId;
      activeWorkout   = workout;

      document.getElementById("edit-title").value = workout.title || "";
      document.getElementById("edit-notes").value = workout.notes || "";

      document.getElementById("edit-warmup-default-sets").value   = workout.warmupDefaultSets ?? "";
      document.getElementById("edit-default-sets").value          = workout.defaultSets ?? "";
      document.getElementById("edit-cooldown-default-sets").value = workout.cooldownDefaultSets ?? "";

      renderEditRpeRows(workout.weeks || []);

      editWarmupSection.clear();
      editCoreSection.clear();
      editCooldownSection.clear();

      (workout.warmupExercises || []).forEach((ex) => editWarmupSection.addRow(ex, ex.setsOverride !== false));
      workout.exercises.forEach((ex) => editCoreSection.addRow(ex, ex.setsOverride !== false));
      (workout.cooldownExercises || []).forEach((ex) => editCooldownSection.addRow(ex, ex.setsOverride !== false));

      if ((workout.warmupExercises || []).length > 0) editWarmupToggle.expand(); else editWarmupToggle.collapse();
      if ((workout.cooldownExercises || []).length > 0) editCooldownToggle.expand(); else editCooldownToggle.collapse();

      editOverlay.hidden = false;
    }

    document.getElementById("edit-modal-close").addEventListener("click", () => { editOverlay.hidden = true; });
    editOverlay.addEventListener("click", (e) => { if (e.target === editOverlay) editOverlay.hidden = true; });
    document.getElementById("edit-add-warmup-exercise").addEventListener("click", () => editWarmupSection.addRow());
    document.getElementById("edit-add-exercise").addEventListener("click", () => editCoreSection.addRow());
    document.getElementById("edit-add-cooldown-exercise").addEventListener("click", () => editCooldownSection.addRow());

    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = editForm.querySelector(".btn-save");
      submitBtn.disabled    = true;
      submitBtn.textContent = "Saving…";

      try {
        const numWeeks = activeWorkout.weeks.length;

        const warmupExercises   = buildExercisesWithWeeks(editWarmupSection.readRows(), numWeeks, activeWorkout.warmupExercises);
        const exercises         = buildExercisesWithWeeks(editCoreSection.readRows(), numWeeks, activeWorkout.exercises);
        const cooldownExercises = buildExercisesWithWeeks(editCooldownSection.readRows(), numWeeks, activeWorkout.cooldownExercises);

        const newTitle = document.getElementById("edit-title").value.trim();
        const newNotes = document.getElementById("edit-notes").value.trim();
        const warmupDefaultSets   = editWarmupSection.getDefaultSets();
        const defaultSets         = editCoreSection.getDefaultSets();
        const cooldownDefaultSets = editCooldownSection.getDefaultSets();

        const rpeInputs = [...editRpeRows.querySelectorAll(".rpe-input")];
        const weeks = activeWorkout.weeks.map((week, i) => ({ ...week, rpe: parseFloat(rpeInputs[i].value) }));

        const updated = {
          title: newTitle, notes: newNotes,
          warmupDefaultSets, warmupExercises,
          defaultSets, exercises,
          cooldownDefaultSets, cooldownExercises,
          weeks,
        };

        await updateDoc(doc(db, "programs", programId, "workouts", activeWorkoutId), updated);

        workoutDocs[activeWorkoutId] = { ...activeWorkout, ...updated };
        editOverlay.hidden = true;
        renderSlots();
        renderProgramDoneButton();
      } catch (err) {
        alert(`Error: ${err.message}`);
      } finally {
        editForm.querySelector(".btn-save").disabled    = false;
        editForm.querySelector(".btn-save").textContent = "Save Changes";
      }
    });

    // Create-workout choice modal
    const createChoiceOverlay = document.getElementById("create-choice-overlay");
    let pendingSlotIdx = null;

    function openCreateChoice(slotIdx) {
      pendingSlotIdx = slotIdx;
      createChoiceOverlay.hidden = false;
    }

    document.getElementById("create-choice-close").addEventListener("click", () => { createChoiceOverlay.hidden = true; });
    createChoiceOverlay.addEventListener("click", (e) => { if (e.target === createChoiceOverlay) createChoiceOverlay.hidden = true; });
    document.getElementById("create-choice-scratch").addEventListener("click", () => {
      window.location.href = `add.html?program=${programId}&slot=${pendingSlotIdx}`;
    });
    document.getElementById("create-choice-copy").addEventListener("click", () => {
      window.location.href = `add.html?program=${programId}&slot=${pendingSlotIdx}&copy=1`;
    });
    document.getElementById("create-choice-placeholder").addEventListener("click", () => {
      window.location.href = `add.html?program=${programId}&slot=${pendingSlotIdx}&placeholder=1`;
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!viewOverlay.hidden) viewOverlay.hidden = true;
      else if (!editOverlay.hidden) editOverlay.hidden = true;
      else if (!createChoiceOverlay.hidden) createChoiceOverlay.hidden = true;
    });

    renderSlots();
    return renderSlots;

    function renderSlots() {
      container.innerHTML = "";
      const items = slots
        .map((workoutId, slotIdx) => ({ workoutId, slotIdx, workout: workoutId ? workoutDocs[workoutId] : null }))
        .sort((a, b) => {
          if (!a.workout && !b.workout) return a.slotIdx - b.slotIdx;
          if (!a.workout) return 1;
          if (!b.workout) return -1;
          return notDoneWeekCount(b.workout) - notDoneWeekCount(a.workout);
        });

      items.forEach(({ workoutId, slotIdx, workout }) => {
        const row = document.createElement("div");
        row.className = "saved-row";

        if (workout) {
          if (isWorkoutComplete(workout)) row.classList.add("saved-row--done");
          const exCount  = workoutExerciseCount(workout);
          const setCount = workoutSetCount(workout);
          row.innerHTML = `
            <div class="saved-info">
              <div class="slot-label">Workout ${slotIdx + 1}</div>
              <div class="saved-title">${workout.title || "Untitled"}</div>
              <div class="saved-pills">
                <span class="pill">${exCount} exercise${exCount !== 1 ? "s" : ""}</span>
                <span class="pill">${setCount} sets</span>
              </div>
            </div>
            <div class="slot-actions">
              <button class="btn-action btn-view">View</button>
              <button class="btn-action btn-action--primary btn-edit">Edit</button>
            </div>
          `;
          row.querySelector(".btn-edit").addEventListener("click", () => openEditModal(workoutDocs[workoutId], workoutId));
          row.querySelector(".btn-view").addEventListener("click", () => openViewModal(workoutDocs[workoutId], workoutId));
        } else {
          row.classList.add("saved-row--clickable");
          row.innerHTML = `
            <div class="saved-info">
              <div class="slot-label">Workout ${slotIdx + 1}</div>
              <div class="saved-title empty">Not configured</div>
            </div>
            <span class="slot-arrow">+</span>
          `;
          row.addEventListener("click", () => openCreateChoice(slotIdx));
        }

        container.appendChild(row);
      });
    }
  }
});
