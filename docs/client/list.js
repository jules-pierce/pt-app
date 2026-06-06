import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { addSignOutButton, checkRole } from "../auth-helpers.js";

const list = document.getElementById("workout-list");

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../login.html"; return; }
  addSignOutButton();
  if (!await checkRole(user, "client")) return;

  list.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem;">Loading…</p>`;

  const q        = query(collection(db, "programs"), where("clientId", "==", user.uid));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    list.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem;">No programs yet.</p>`;
    return;
  }

  list.innerHTML = "";
  snapshot.forEach((docSnap) => {
    const program    = docSnap.data();
    const programId  = docSnap.id;
    const configured = (program.workoutSlots || []).filter(Boolean).length;

    const card = document.createElement("a");
    card.className = "workout-card";
    card.href      = `program.html?id=${programId}`;
    card.innerHTML = `
      <div class="workout-card-inner">
        <div class="workout-card-info">
          <div class="workout-card-title">${program.title}</div>
        </div>
        <div class="workout-card-meta">
          <span>${program.numWeeks} weeks</span>
          <span>${configured} workouts</span>
          <span class="workout-card-arrow">→</span>
        </div>
      </div>
    `;
    list.appendChild(card);
  });
});
