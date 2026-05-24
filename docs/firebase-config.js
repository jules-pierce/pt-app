import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAJEKrdlb0BCVD-nFV9RluyHUYhTDXSQ1w",
  authDomain:        "swolie-exercise-app.firebaseapp.com",
  projectId:         "swolie-exercise-app",
  storageBucket:     "swolie-exercise-app.firebasestorage.app",
  messagingSenderId: "357478219520",
  appId:             "1:357478219520:web:24e3786ff9a8cb07047de5",
};

const app = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);
