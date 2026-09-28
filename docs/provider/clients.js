import { auth, db, firebaseConfig } from "../firebase-config.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  onAuthStateChanged, getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, collection, query, where, documentId, getDocs, doc, setDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { addSignOutButton, checkRole, displayName } from "../auth-helpers.js";

const searchInput = document.getElementById("client-search");
const optionsList = document.getElementById("client-options");
const statusEl    = document.getElementById("client-status");

let currentUser = null;
let linkedIds   = new Set();
let clients     = [];   // { id, name, email, haystack }, sorted by name
let matches     = [];   // subset of clients matching the search box
let activeIdx   = -1;   // keyboard-highlighted index into matches

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../login.html"; return; }
  addSignOutButton();
  if (!await checkRole(user, "provider")) return;
  currentUser = user;
  await loadClients();
});

async function loadClients() {
  statusEl.textContent = "Loading…";
  searchInput.disabled = true;

  const linksSnap = await getDocs(collection(db, "users", currentUser.uid, "clients"));
  const ids       = linksSnap.docs.map((d) => d.id);
  linkedIds = new Set(ids);

  // Fetch the linked users' docs in batches ("in" queries take up to 30 ids)
  // rather than one read per client.
  const chunks = [];
  for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
  const snaps = await Promise.all(chunks.map((chunk) =>
    getDocs(query(collection(db, "users"), where(documentId(), "in", chunk)))
  ));
  const userData = new Map(snaps.flatMap((snap) => snap.docs.map((d) => [d.id, d.data()])));

  clients = ids.map((id) => {
    const data  = userData.get(id);
    const name  = displayName(data);
    const email = data?.email ?? "";
    return { id, name, email, haystack: `${name} ${email}`.toLowerCase() };
  }).sort((a, b) => a.name.localeCompare(b.name));

  if (clients.length === 0) {
    statusEl.textContent = "No linked clients yet.";
    return;
  }

  statusEl.textContent = `${clients.length} client${clients.length === 1 ? "" : "s"}`;
  searchInput.disabled = false;
  filter();
}

// ── Searchable dropdown ───────────────────────────────────────────────────────
function filter() {
  const terms = searchInput.value.toLowerCase().split(/\s+/).filter(Boolean);
  matches   = clients.filter((c) => terms.every((t) => c.haystack.includes(t)));
  activeIdx = matches.length ? 0 : -1;
  renderOptions();
}

function renderOptions() {
  optionsList.innerHTML = "";

  if (matches.length === 0) {
    const empty = document.createElement("li");
    empty.className   = "combobox-empty";
    empty.textContent = "No matching clients.";
    optionsList.appendChild(empty);
  }

  matches.forEach((client, i) => {
    const li = document.createElement("li");
    li.id        = `client-option-${i}`;
    li.className = "combobox-option" + (i === activeIdx ? " is-active" : "");
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", String(i === activeIdx));
    li.innerHTML = `<span class="combobox-option-name"></span><span class="combobox-option-email"></span>`;
    li.querySelector(".combobox-option-name").textContent  = client.name;
    li.querySelector(".combobox-option-email").textContent = client.email;
    // mousedown (not click) so the input doesn't blur and close the list first.
    li.addEventListener("mousedown", (e) => { e.preventDefault(); selectClient(client); });
    li.addEventListener("mousemove", () => { if (activeIdx !== i) setActive(i); });
    optionsList.appendChild(li);
  });

  searchInput.setAttribute("aria-activedescendant", activeIdx >= 0 ? `client-option-${activeIdx}` : "");
}

function setActive(i) {
  optionsList.querySelector(".is-active")?.classList.remove("is-active");
  activeIdx = i;
  const li = document.getElementById(`client-option-${i}`);
  li?.classList.add("is-active");
  li?.scrollIntoView({ block: "nearest" });
  searchInput.setAttribute("aria-activedescendant", li ? li.id : "");
}

function openList()  { optionsList.hidden = false; searchInput.setAttribute("aria-expanded", "true"); }
function closeList() { optionsList.hidden = true;  searchInput.setAttribute("aria-expanded", "false"); }

function selectClient(client) {
  window.location.href = `programs.html?client=${client.id}`;
}

searchInput.addEventListener("focus", openList);
searchInput.addEventListener("blur",  closeList);
searchInput.addEventListener("input", () => { filter(); openList(); });
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    openList();
    if (!matches.length) return;
    const step = e.key === "ArrowDown" ? 1 : -1;
    setActive((activeIdx + step + matches.length) % matches.length);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (activeIdx >= 0) selectClient(matches[activeIdx]);
  } else if (e.key === "Escape") {
    closeList();
  }
});

function linkClient(clientId) {
  return setDoc(doc(db, "users", currentUser.uid, "clients", clientId), {
    linkedAt: serverTimestamp(),
  });
}

// ── Modals ────────────────────────────────────────────────────────────────────
// Wires an overlay + form: open button, close (✕ / backdrop), inline error,
// and a submit handler that returns normally on success or throws a message.
function setupModal(name, openBtnId, onSubmit) {
  const overlay   = document.getElementById(`${name}-overlay`);
  const form      = document.getElementById(`${name}-form`);
  const errorEl   = form.querySelector(".form-error");
  const submitBtn = form.querySelector(".btn-save");
  const label     = submitBtn.textContent;

  const close = () => { overlay.hidden = true; };

  document.getElementById(openBtnId).addEventListener("click", () => {
    form.reset();
    errorEl.hidden  = true;
    overlay.hidden  = false;
    form.querySelector("input").focus();
  });
  overlay.querySelector("[data-close]").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    errorEl.hidden        = true;
    submitBtn.disabled    = true;
    submitBtn.textContent = "Working…";
    try {
      await onSubmit();
      close();
      await loadClients();
    } catch (err) {
      errorEl.textContent = err.message ?? String(err);
      errorEl.hidden      = false;
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = label;
    }
  });
}

// ── Connect an existing client account by email ───────────────────────────────
setupModal("connect", "connect-client-btn", async () => {
  const email = document.getElementById("connect-email").value.trim();

  const snap  = await getDocs(query(collection(db, "users"), where("email", "==", email)));
  const match = snap.docs.find((d) => d.data().role === "client");

  if (!match) {
    throw new Error(snap.empty
      ? `No account found for "${email}".`
      : `"${email}" isn't a client account.`);
  }
  if (linkedIds.has(match.id)) {
    throw new Error(`${displayName(match.data())} is already one of your clients.`);
  }

  await linkClient(match.id);

  const data = match.data();
  showSuccess({
    clientId:  match.id,
    title:     "Client connected",
    name:      displayName(data),
    firstName: data.firstName,
    email,
    note:      "They'll see the programs you create for them when they sign in as",
  });
});

// ── Create a brand-new client account ─────────────────────────────────────────
// Firebase Auth's createUser signs in as the new user, which would sign the
// provider out. So the account is created on a secondary app instance, then
// the client is emailed a link to set their own password.
function secondaryApp() {
  return getApps().find((a) => a.name === "client-signup")
    ?? initializeApp(firebaseConfig, "client-signup");
}

function randomPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes));
}

setupModal("create", "create-client-btn", async () => {
  const firstName = document.getElementById("create-first-name").value.trim();
  const lastName  = document.getElementById("create-last-name").value.trim();
  const email     = document.getElementById("create-email").value.trim();

  const app        = secondaryApp();
  const clientAuth = getAuth(app);

  let cred;
  try {
    cred = await createUserWithEmailAndPassword(clientAuth, email, randomPassword());
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      throw new Error(`An account for "${email}" already exists. Use Connect Existing Client instead.`);
    }
    throw err;
  }

  try {
    // Written as the new user — the rules only let a user create their own doc.
    await setDoc(doc(getFirestore(app), "users", cred.user.uid), {
      firstName, lastName, email, role: "client",
    });
  } finally {
    await signOut(clientAuth);
  }

  await linkClient(cred.user.uid);
  await sendPasswordResetEmail(auth, email);
  showSuccess({
    clientId:  cred.user.uid,
    title:     "Client created",
    name:      `${firstName} ${lastName}`,
    firstName,
    email,
    note:      "We emailed a link to set their password to",
  });
});

// ── Success confirmation (connect + create) ───────────────────────────────────
const successOverlay = document.getElementById("success-overlay");
successOverlay.querySelectorAll("[data-close]").forEach((btn) =>
  btn.addEventListener("click", () => { successOverlay.hidden = true; })
);
successOverlay.addEventListener("click", (e) => {
  if (e.target === successOverlay) successOverlay.hidden = true;
});

function showSuccess({ clientId, title, name, firstName, email, note }) {
  document.getElementById("success-title").textContent = title;
  document.getElementById("success-name").textContent  = name;
  document.getElementById("success-note").textContent  = note;
  document.getElementById("success-email").textContent = email;
  const link = document.getElementById("success-programs-link");
  link.href        = `programs.html?client=${clientId}`;
  link.textContent = firstName ? `Go to ${firstName}'s programs` : "Go to their programs";
  successOverlay.hidden = false;
}
