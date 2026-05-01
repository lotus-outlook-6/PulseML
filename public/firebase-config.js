/**
 * PulseML — Firebase Client Configuration
 *
 * ── Why these values are safe to commit ──────────────────────────────────────
 * Firebase Web API keys are NOT secret. They are client-side identifiers that
 * tell the Firebase SDK which project to connect to. Google documents this:
 * https://firebase.google.com/docs/projects/api-keys
 *
 * Access control is enforced server-side by:
 *   1. Firebase Security Rules  (firestore.rules) — only anonymous-auth users
 *      can CREATE assessments; nobody can READ, UPDATE or DELETE.
 *   2. Firebase Console → App Check — enable to block unofficial clients.
 *   3. Google Cloud Console → API key restrictions — lock this key to your
 *      production domain (e.g. pulseml-ai.web.app) so it cannot be used from
 *      other origins.
 *
 * ── How to lock this down before going public ────────────────────────────────
 *   Step 1: Firebase Console → Authentication → Settings → Authorised domains
 *           Add only your production domain. Remove localhost if not needed.
 *   Step 2: Google Cloud Console → Credentials → Restrict your API key
 *           to HTTP referrers: https://pulseml-ai.web.app/*
 *   Step 3: Firebase Console → App Check → Register your web app with
 *           reCAPTCHA v3 to block non-browser clients.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const firebaseConfig = {
    apiKey:            "AIzaSyB_oPszXykBcPw6_sbKBS6NFJ7ObPWAe3I",
    authDomain:        "pulseml-ai.firebaseapp.com",
    projectId:         "pulseml-ai",
    storageBucket:     "pulseml-ai.firebasestorage.app",
    messagingSenderId: "377229468004",
    appId:             "1:377229468004:web:b16124234804502c135a71",
};
