import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { addSignOutButton, checkRole } from "../auth-helpers.js";

const params    = new URLSearchParams(window.location.search);
const programId = params.get("id");

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../login.html"; return; }
  addSignOutButton();
  if (!await checkRole(user, "provider")) return;

  const programSnap = await getDoc(doc(db, "programs", programId));
  if (!programSnap.exists()) {
    document.querySelector("main").innerHTML = `<p class="empty-state">Program not found.</p>`;
    return;
  }

  const program = programSnap.data();
  document.getElementById("program-title").textContent = program.title;
  document.getElementById("program-meta").textContent  =
    `${program.numWeeks} weeks · ${program.workoutSlots.length} workouts`;

  const slots = program.workoutSlots || [];

  // Fetch all configured workout docs in parallel
  const workoutDocs = {};
  await Promise.all(
    slots.filter(Boolean).map(async (wId) => {
      const snap = await getDoc(doc(db, "programs", programId, "workouts", wId));
      if (snap.exists()) workoutDocs[wId] = snap.data();
    })
  );

  const container = document.getElementById("workout-slots");

  slots.forEach((workoutId, slotIdx) => {
    const workout = workoutId ? workoutDocs[workoutId] : null;
    const row = document.createElement("div");
    row.className = "saved-row saved-row--clickable";

    if (workout) {
      const exCount = workout.weeks[0]?.exercises?.length ?? 0;
      row.innerHTML = `
        <div class="saved-info">
          <div class="slot-label">Workout ${slotIdx + 1}</div>
          <div class="saved-title">${workout.title || "Untitled"}</div>
          <div class="saved-meta">${exCount} exercises</div>
        </div>
        <span class="slot-arrow">→</span>
      `;
      row.addEventListener("click", () => {
        window.location.href = `edit.html?program=${programId}&workout=${workoutId}`;
      });
    } else {
      row.innerHTML = `
        <div class="saved-info">
          <div class="slot-label">Workout ${slotIdx + 1}</div>
          <div class="saved-title empty">Not configured</div>
        </div>
        <span class="slot-arrow">+</span>
      `;
      row.addEventListener("click", () => {
        window.location.href = `add.html?program=${programId}&slot=${slotIdx}`;
      });
    }

    container.appendChild(row);
  });
});
