import { auth } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

/**
 * Appends a "Sign Out" button to .header-inner and wires it up.
 * @param {string} loginPath  Relative path to login.html from the current page.
 */
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
