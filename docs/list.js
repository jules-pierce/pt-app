import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { addSignOutButton } from "./auth-helpers.js";

const container = document.getElementById("program-list");

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../login.html"; return; }
  addSignOutButton();

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const role     = userSnap.exists() ? userSnap.data().role : null;

  if (!role) {
    container.innerHTML = `<p class="empty-state">Could not determine your role. Try signing out and back in.</p>`;
    return;
  }

  document.getElementById("role-label").textContent = role === "provider" ? "Provider" : "Training Plan";

  container.innerHTML = `<p class="empty-state">Loading…</p>`;

  const field    = role === "provider" ? "providerId" : "clientId";
  const q        = query(collection(db, "programs"), where(field, "==", user.uid));
  const snapshot = await getDocs(q);

  container.innerHTML = "";

  if (snapshot.empty) {
    container.innerHTML = `<p class="empty-state">No programs yet.</p>`;
  } else {
    snapshot.forEach((docSnap) => {
      const program   = docSnap.data();
      const programId = docSnap.id;
      const slots     = program.workoutSlots || [];
      const configured = slots.filter(Boolean).length;

      const row = document.createElement("div");
      row.className = "saved-row saved-row--clickable";
      row.innerHTML = `
        <div class="saved-info">
          <div class="saved-title">${program.title || "Untitled"}</div>
          <div class="saved-meta">${program.numWeeks} weeks · ${configured}/${slots.length} workouts configured</div>
        </div>
        ${role === "provider" ? `<button class="btn-delete">Delete</button>` : ""}
      `;

      row.addEventListener("click", () => {
        window.location.href = `program.html?id=${programId}`;
      });

      if (role === "provider") {
        row.querySelector(".btn-delete").addEventListener("click", async (e) => {
          e.stopPropagation();
          if (!confirm(`Delete "${program.title}"?`)) return;
          await deleteDoc(doc(db, "programs", programId));
          row.remove();
          if (container.querySelectorAll(".saved-row").length === 0) {
            container.innerHTML = `<p class="empty-state">No programs yet.</p>`;
          }
        });
      }

      container.appendChild(row);
    });
  }

  if (role === "provider") {
    const link = document.createElement("a");
    link.href      = "program-new.html";
    link.className = "btn-add-workout";
    link.textContent = "+ Create Program";
    document.querySelector("main").appendChild(link);
  }
});
