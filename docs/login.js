import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ── Toggle sign-in / sign-up ──────────────────────────────────────────────────
const signinSection = document.getElementById("signin-section");
const signupSection = document.getElementById("signup-section");

document.getElementById("show-signup").addEventListener("click", () => {
  signinSection.style.display = "none";
  signupSection.style.display = "block";
});
document.getElementById("show-signin").addEventListener("click", () => {
  signupSection.style.display = "none";
  signinSection.style.display = "block";
});

// ── Redirect by role ──────────────────────────────────────────────────────────
function redirect(role) {
  window.location.href = role === "provider" ? "./provider/" : "./client/";
}

// ── Sign In ───────────────────────────────────────────────────────────────────
document.getElementById("signin-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("signin-error");
  errorEl.style.display = "none";

  const email    = document.getElementById("signin-email").value.trim();
  const password = document.getElementById("signin-password").value;

  try {
    const cred     = await signInWithEmailAndPassword(auth, email, password);
    const userSnap = await getDoc(doc(db, "users", cred.user.uid));
    redirect(userSnap.data()?.role ?? "client");
  } catch {
    errorEl.textContent    = "Invalid email or password.";
    errorEl.style.display  = "block";
  }
});

// ── Create Account ────────────────────────────────────────────────────────────
document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("signup-error");
  errorEl.style.display = "none";

  const email    = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const role     = document.querySelector('input[name="role"]:checked').value;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), { email, role });
    redirect(role);
  } catch (err) {
    errorEl.textContent   = err.message ?? "Could not create account.";
    errorEl.style.display = "block";
  }
});
