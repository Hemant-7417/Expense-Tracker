/* ═══════════════════════════════════════════════════════════════════
   Finance Tracker Pro — Shared Firebase Configuration
   Single source of truth for Firebase credentials.
   Loaded by both auth.html and index.html BEFORE auth.js / auth-guard.js
   ═══════════════════════════════════════════════════════════════════ */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCDGSM3hOJeymQR6O5k44TazUBBFcKZA6M",
  authDomain: "expense-tracker-84c45.firebaseapp.com",
  projectId: "expense-tracker-84c45",
  storageBucket: "expense-tracker-84c45.firebasestorage.app",
  messagingSenderId: "874053563567",
  appId: "1:874053563567:web:4805946c8fba3e3341505a",
  measurementId: "G-SZZ3LFYKQ3"
};

// Initialize Firebase (compat SDK) — safe to call multiple times
if (typeof firebase !== "undefined" && !firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}
