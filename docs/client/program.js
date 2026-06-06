import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { addSignOutButton, checkRole } from "../auth-helpers.js";

const params    = new URLSearchParams(window.location.search);
const programId = params.get("id");

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../login.html"; return; }
  addSignOutButton();
  if (!await checkRole(user, "client")) return;

  const programSnap = await getDoc(doc(db, "programs", programId));
  if (!programSnap.exists() || programSnap.data().clientId !== user.uid) {
    window.location.href = "index.html";
    return;
  }

  const program = programSnap.data();
  document.getElementById("program-title").textContent = program.title;

  const list = document.getElementById("workout-list");
  list.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem;">Loading…</p>`;

  const slots      = program.workoutSlots || [];
  const workoutIds = slots.filter(Boolean);

  // Fetch all configured workout docs in parallel
  const workoutDocs = {};
  await Promise.all(
    workoutIds.map(async (wId) => {
      const snap = await getDoc(doc(db, "programs", programId, "workouts", wId));
      if (snap.exists()) workoutDocs[wId] = snap.data();
    })
  );

  list.innerHTML = "";
  slots.forEach((workoutId) => {
    if (!workoutId) return;
    const workout = workoutDocs[workoutId];
    if (!workout) return;

    const totalSets = workout.weeks[0].exercises.reduce((sum, ex) => sum + ex.sets, 0);
    const estTime   = Math.round(totalSets * 2.5);

    const card = document.createElement("a");
    card.className = "workout-card";
    card.href      = `workout.html?program=${programId}&workout=${workoutId}`;
    card.innerHTML = `
      <div class="workout-card-inner">
        <div class="workout-card-info">
          <div class="workout-card-title">${workout.title}</div>
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

  if (list.children.length === 0) {
    list.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem;">No workouts configured yet.</p>`;
  }
});
