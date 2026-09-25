import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, getDocs, addDoc, updateDoc, collection, query, where } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { addSignOutButton, checkRole } from "../auth-helpers.js";
import { createExerciseSection, buildExercisesWithWeeks, createCollapsibleSection } from "../exercise-form-row.js";

const params        = new URLSearchParams(window.location.search);
const programId     = params.get("program");
const slotIdx       = parseInt(params.get("slot"), 10);
const isPlaceholder = params.get("placeholder") === "1";

let currentUser = null;
let program     = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../login.html"; return; }
  addSignOutButton();
  if (!await checkRole(user, "provider")) return;
  currentUser = user;

  const programSnap = await getDoc(doc(db, "programs", programId));
  if (programSnap.exists()) program = programSnap.data();

  // A placeholder workout has no core exercises: hide that section and drop
  // its "required" attribute (a hidden-but-still-required field can't be
  // focused to show its validation bubble, which makes Chrome silently
  // block the submit instead of saving). Warmup/cooldown stay collapsed
  // behind their usual + buttons, same as the regular flow.
  if (isPlaceholder) {
    document.getElementById("core-workout-box").hidden = true;
    document.getElementById("default-sets").required = false;
  }
});

const getNumWeeks = () => program?.numWeeks ?? 1;

const warmupSection   = createExerciseSection(
  document.getElementById("warmup-exercise-rows"), document.getElementById("warmup-default-sets"), getNumWeeks
);
const coreSection     = createExerciseSection(
  document.getElementById("exercise-rows"), document.getElementById("default-sets"), getNumWeeks
);
const cooldownSection = createExerciseSection(
  document.getElementById("cooldown-exercise-rows"), document.getElementById("cooldown-default-sets"), getNumWeeks
);

document.getElementById("add-warmup-exercise").addEventListener("click", () => warmupSection.addRow());
document.getElementById("add-exercise").addEventListener("click", () => coreSection.addRow());
document.getElementById("add-cooldown-exercise").addEventListener("click", () => cooldownSection.addRow());

const warmupToggle   = createCollapsibleSection(document.getElementById("show-warmup-btn"), document.getElementById("warmup-box"));
const cooldownToggle = createCollapsibleSection(document.getElementById("show-cooldown-btn"), document.getElementById("cooldown-box"));

// Opening a section from its placeholder button starts it with one exercise
// row already in place, rather than an empty list.
document.getElementById("show-warmup-btn").addEventListener("click", () => warmupSection.addRow());
document.getElementById("show-cooldown-btn").addEventListener("click", () => cooldownSection.addRow());

// ── Copy from a previous workout (entered via the program page's choice
// modal, which links here with ?copy=1 — there's no in-page button) ────────
const copyOverlay = document.getElementById("copy-workout-overlay");
const copyList    = document.getElementById("copy-workout-list");

document.getElementById("copy-workout-close").addEventListener("click", () => { copyOverlay.hidden = true; });
copyOverlay.addEventListener("click", (e) => { if (e.target === copyOverlay) copyOverlay.hidden = true; });

if (params.get("copy")) {
  copyOverlay.hidden = false;
  loadCopySources();
}

async function loadCopySources() {
  copyList.innerHTML = `<p class="empty-state">Loading…</p>`;

  const programsSnap = await getDocs(
    query(collection(db, "programs"), where("providerId", "==", currentUser.uid))
  );

  const groups = [];
  for (const programDoc of programsSnap.docs) {
    const workoutsSnap = await getDocs(collection(db, "programs", programDoc.id, "workouts"));
    if (workoutsSnap.empty) continue;
    groups.push({
      title:    programDoc.data().title || "Untitled",
      workouts: workoutsSnap.docs.map((d) => ({
        id:        d.id,
        programId: programDoc.id,
        title:     d.data().title || "Untitled",
      })),
    });
  }

  if (groups.length === 0) {
    copyList.innerHTML = `<p class="empty-state">No existing workouts to copy from.</p>`;
    return;
  }

  copyList.innerHTML = "";
  groups.forEach((group) => {
    const groupEl = document.createElement("div");
    groupEl.className = "copy-source-group";
    groupEl.innerHTML = `<div class="slot-label">${group.title}</div>`;

    group.workouts.forEach((w) => {
      const row = document.createElement("div");
      row.className = "saved-row saved-row--clickable";
      row.innerHTML = `
        <div class="saved-info"><div class="saved-title">${w.title}</div></div>
        <span class="slot-arrow">›</span>
      `;
      row.addEventListener("click", () => applyCopySource(w.programId, w.id));
      groupEl.appendChild(row);
    });

    copyList.appendChild(groupEl);
  });
}

async function applyCopySource(sourceProgramId, sourceWorkoutId) {
  const workoutSnap = await getDoc(doc(db, "programs", sourceProgramId, "workouts", sourceWorkoutId));
  if (!workoutSnap.exists()) return;
  const workout = workoutSnap.data();

  document.getElementById("title").value = workout.title || "";
  document.getElementById("notes").value = workout.notes || "";

  document.getElementById("warmup-default-sets").value = workout.warmupDefaultSets ?? "";
  document.getElementById("default-sets").value        = workout.defaultSets ?? "";
  document.getElementById("cooldown-default-sets").value = workout.cooldownDefaultSets ?? "";

  warmupSection.clear();
  coreSection.clear();
  cooldownSection.clear();

  (workout.warmupExercises || []).forEach((ex) => warmupSection.addRow(ex, ex.setsOverride !== false));
  (workout.exercises || []).forEach((ex) => coreSection.addRow(ex, ex.setsOverride !== false));
  (workout.cooldownExercises || []).forEach((ex) => cooldownSection.addRow(ex, ex.setsOverride !== false));

  if ((workout.warmupExercises || []).length > 0) warmupToggle.expand(); else warmupToggle.collapse();
  if ((workout.cooldownExercises || []).length > 0) cooldownToggle.expand(); else cooldownToggle.collapse();

  copyOverlay.hidden = true;
}

document.getElementById("workout-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !program) return;

  const submitBtn = e.target.querySelector(".btn-save");
  submitBtn.disabled    = true;
  submitBtn.textContent = "Saving…";

  try {
    const rawExercises = coreSection.readRows();

    if (!isPlaceholder && rawExercises.length === 0) {
      submitBtn.disabled    = false;
      submitBtn.textContent = "Save Workout";
      return;
    }

    const numWeeks = program.numWeeks;
    const weeks    = Array.from({ length: numWeeks }, (_, i) => ({ rpe: 5 + i }));

    const workoutRef = await addDoc(collection(db, "programs", programId, "workouts"), {
      title:                document.getElementById("title").value.trim(),
      notes:                document.getElementById("notes").value.trim(),
      warmupDefaultSets:    warmupSection.getDefaultSets(),
      warmupExercises:      buildExercisesWithWeeks(warmupSection.readRows(), numWeeks),
      defaultSets:          coreSection.getDefaultSets(),
      exercises:            buildExercisesWithWeeks(rawExercises, numWeeks),
      cooldownDefaultSets:  cooldownSection.getDefaultSets(),
      cooldownExercises:    buildExercisesWithWeeks(cooldownSection.readRows(), numWeeks),
      weeks,
    });

    const slots = [...(program.workoutSlots || [])];
    slots[slotIdx] = workoutRef.id;
    await updateDoc(doc(db, "programs", programId), { workoutSlots: slots });

    window.location.href = `program.html?id=${programId}`;
  } catch (err) {
    alert(`Error: ${err.message}`);
    submitBtn.disabled    = false;
    submitBtn.textContent = "Save Workout";
  }
});
