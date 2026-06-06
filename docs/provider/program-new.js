import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { addSignOutButton, checkRole } from "../auth-helpers.js";

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../login.html"; return; }
  addSignOutButton();
  if (!await checkRole(user, "provider")) return;
  currentUser = user;
});

document.getElementById("program-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const submitBtn = e.target.querySelector(".btn-save");
  submitBtn.disabled    = true;
  submitBtn.textContent = "Creating…";

  try {
    const clientEmail = document.getElementById("client-email").value.trim();
    const numWorkouts = parseInt(document.getElementById("num-workouts").value, 10);
    const numWeeks    = parseInt(document.getElementById("num-weeks").value, 10);

    // Look up the client by email
    const usersSnap = await getDocs(
      query(collection(db, "users"), where("email", "==", clientEmail))
    );

    if (usersSnap.empty) {
      alert(`No account found for "${clientEmail}". Ask the client to sign in once first.`);
      submitBtn.disabled    = false;
      submitBtn.textContent = "Create Program";
      return;
    }

    const clientId = usersSnap.docs[0].id;

    const programRef = await addDoc(collection(db, "programs"), {
      title:        document.getElementById("title").value.trim(),
      numWeeks,
      workoutSlots: Array(numWorkouts).fill(null),
      clientId,
      providerId:   currentUser.uid,
      createdAt:    serverTimestamp(),
    });

    window.location.href = `program.html?id=${programRef.id}`;
  } catch (err) {
    alert(`Error: ${err.message}`);
    submitBtn.disabled    = false;
    submitBtn.textContent = "Create Program";
  }
});
