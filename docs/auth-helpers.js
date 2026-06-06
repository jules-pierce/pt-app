import { auth, db } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export function addSignOutButton(loginPath = "../login.html") {
  const btn = document.createElement("button");
  btn.textContent = "Sign Out";
  btn.className   = "btn-signout";
  document.querySelector(".header-inner")?.appendChild(btn);
  btn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = loginPath;
  });
}

// Returns true if the signed-in user has the expected role.
// If not, replaces <main> with an error message and returns false.
export async function checkRole(user, expectedRole, loginPath = "../login.html") {
  const snap = await getDoc(doc(db, "users", user.uid));
  const role = snap.exists() ? snap.data().role : null;
  if (role === expectedRole) return true;

  const pageType = expectedRole === "provider" ? "providers" : "clients";
  const userType = role || "unknown";

  const main = document.querySelector("main") || document.body;
  main.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:1.25rem;padding:4rem 1rem;text-align:center;">
      <p style="color:var(--text-muted);font-size:0.95rem;max-width:340px;line-height:1.5;">
        This page is for ${pageType} only.<br/>You're signed in as a <strong style="color:var(--text)">${userType}</strong>.
      </p>
      <button id="role-error-switch" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--accent-light);font-family:var(--font);font-size:0.85rem;font-weight:600;padding:0.4rem 1rem;cursor:pointer;">
        Switch accounts &rarr;
      </button>
    </div>
  `;
  document.getElementById("role-error-switch").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = loginPath;
  });

  return false;
}
