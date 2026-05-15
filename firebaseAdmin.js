/* ═══════════════════════════════════════════════════════════════════
   Finance Tracker Pro — Firebase Admin SDK Initialization
   Used server-side to verify Firebase ID tokens from the frontend.
   ═══════════════════════════════════════════════════════════════════ */
const admin = require("firebase-admin");

// Initialize with the project ID only — no service account file needed
// for ID token verification (verifyIdToken uses Google's public keys).
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "expense-tracker-84c45",
  });
}

module.exports = admin;
