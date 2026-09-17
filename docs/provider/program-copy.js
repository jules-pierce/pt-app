import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  collection, addDoc, doc, getDoc, getDocs, query, where, serverTimestamp, updateDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { addSignOutButton, checkRole } from "../auth-helpers.js";

let currentUser      = null;
let sourceProgramId  = null;
let sourceProgram    = null;

const selectSection  = document.getElementById("select-section");
const detailsSection = document.getElementById("details-section");
const sourceList     = document.getElementById("source-list");

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../login.html"; return; }
  addSignOutButton();
  if (!await checkRole(user, "provider")) return;
  currentUser = user;
  await loadSourcePrograms();
});

async function loadSourcePrograms() {
  sourceList.innerHTML = `<p class="empty-state">Loading…</p>`;

  const q        = query(collection(db, "programs"), where("providerId", "==", currentUser.uid));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    sourceList.innerHTML = `<p class="empty-state">No existing programs to copy from.</p>`;
    return;
  }

  sourceList.innerHTML = "";
  snapshot.docs.forEach((docSnap) => {
    const program = docSnap.data();
    const slots   = program.workoutSlots || [];

    const row = document.createElement("div");
    row.className = "saved-row saved-row--clickable";
    row.innerHTML = `
      <div class="saved-info">
        <div class="saved-title">${program.title || "Untitled"}</div>
        <div class="saved-meta">${program.numWeeks} weeks · ${slots.filter(Boolean).length}/${slots.length} workouts configured</div>
      </div>
      <span class="slot-arrow">›</span>
    `;
    row.addEventListener("click", () => selectSource(docSnap.id, program));
    sourceList.appendChild(row);
  });
}

// Strips per-client state (done status, client notes, logged weights) so a
// copied program starts fresh for its new client.
function sanitizeWorkoutForCopy(workoutData) {
  const exercises = (workoutData.exercises || []).map((ex) => ({
    ...ex,
    weeks: (ex.weeks || []).map((week) => {
      const { done, clientNote, ...rest } = week;
      return { ...rest, weight: "" };
    }),
  }));
  return { ...workoutData, exercises };
}

function selectSource(programId, program) {
  sourceProgramId = programId;
  sourceProgram   = program;

  const slots = program.workoutSlots || [];
  document.getElementById("source-title").textContent = program.title || "Untitled";
  document.getElementById("source-meta").textContent =
    `${program.numWeeks} weeks · ${slots.filter(Boolean).length}/${slots.length} workouts`;
  document.getElementById("title").value = `${program.title || "Untitled"} (Copy)`;

  selectSection.hidden  = true;
  detailsSection.hidden = false;
}

document.getElementById("change-source-btn").addEventListener("click", () => {
  detailsSection.hidden = true;
  selectSection.hidden  = false;
});

document.getElementById("copy-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !sourceProgramId) return;

  const submitBtn = e.target.querySelector(".btn-save");
  submitBtn.disabled    = true;
  submitBtn.textContent = "Copying…";

  try {
    const clientEmail = document.getElementById("client-email").value.trim();

    const usersSnap = await getDocs(
      query(collection(db, "users"), where("email", "==", clientEmail))
    );

    if (usersSnap.empty) {
      alert(`No account found for "${clientEmail}". Ask the client to sign in once first.`);
      submitBtn.disabled    = false;
      submitBtn.textContent = "Copy Program";
      return;
    }

    const clientId = usersSnap.docs[0].id;
    const slots     = sourceProgram.workoutSlots || [];

    const programRef = await addDoc(collection(db, "programs"), {
      title:        document.getElementById("title").value.trim(),
      numWeeks:     sourceProgram.numWeeks,
      workoutSlots: Array(slots.length).fill(null),
      clientId,
      providerId:   currentUser.uid,
      createdAt:    serverTimestamp(),
    });

    const newSlots = await Promise.all(slots.map(async (workoutId) => {
      if (!workoutId) return null;
      const workoutSnap = await getDoc(doc(db, "programs", sourceProgramId, "workouts", workoutId));
      if (!workoutSnap.exists()) return null;
      const newWorkoutRef = await addDoc(
        collection(db, "programs", programRef.id, "workouts"),
        sanitizeWorkoutForCopy(workoutSnap.data())
      );
      return newWorkoutRef.id;
    }));

    await updateDoc(programRef, { workoutSlots: newSlots });

    window.location.href = `program.html?id=${programRef.id}`;
  } catch (err) {
    alert(`Error: ${err.message}`);
    submitBtn.disabled    = false;
    submitBtn.textContent = "Copy Program";
  }
});
