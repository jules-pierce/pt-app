import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { addSignOutButton } from "../auth-helpers.js";

const container = document.getElementById("program-list");

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../login.html"; return; }
  addSignOutButton();

  container.innerHTML = `<p class="empty-state">Loading…</p>`;

  const q        = query(collection(db, "programs"), where("providerId", "==", user.uid));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    container.innerHTML = `<p class="empty-state">No programs yet.</p>`;
    return;
  }

  container.innerHTML = "";
  snapshot.forEach((docSnap) => {
    const program    = docSnap.data();
    const programId  = docSnap.id;
    const slots      = program.workoutSlots || [];
    const configured = slots.filter(Boolean).length;

    const row = document.createElement("div");
    row.className = "saved-row saved-row--clickable";
    row.innerHTML = `
      <div class="saved-info">
        <div class="saved-title">${program.title || "Untitled"}</div>
        <div class="saved-meta">${program.numWeeks} weeks · ${configured}/${slots.length} workouts configured</div>
      </div>
      <button class="btn-delete">Delete</button>
    `;

    row.addEventListener("click", () => {
      window.location.href = `program.html?id=${programId}`;
    });

    row.querySelector(".btn-delete").addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm(`Delete "${program.title}"?`)) return;
      await deleteDoc(doc(db, "programs", programId));
      row.remove();
      if (container.children.length === 0) {
        container.innerHTML = `<p class="empty-state">No programs yet.</p>`;
      }
    });

    container.appendChild(row);
  });
});
