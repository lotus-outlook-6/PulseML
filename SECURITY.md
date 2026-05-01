# Security Policy

## What is in this repository

### Firebase Web Configuration (`public/firebase-config.js`)

The Firebase `apiKey`, `projectId`, `appId`, and related values in this file are **client-side identifiers**, not secrets. Google explicitly documents that these values are safe to include in public code:

> "It's okay to include them in version control or client-side code."
> — [Firebase documentation on API keys](https://firebase.google.com/docs/projects/api-keys)

Access to Firebase services is controlled by:

1. **Firestore Security Rules** (`firestore.rules`) — only anonymous-authenticated users can create assessment documents. No document can be read, updated, or deleted by any client.
2. **Firebase Authentication** — only requests with a valid anonymous token (issued by Firebase Auth) are accepted by Firestore.
3. **Domain restrictions** — the API key should be restricted to the production domain in the Google Cloud Console (see below).

### SSL certificate files (`selfsigned.crt`, `selfsigned.key`)

The `selfsigned.key` private key and `selfsigned.crt` certificate are used only for **local development** (running the HTTPS server on your LAN to test geolocation on a phone). These files are excluded from version control via `.gitignore`. They are auto-generated each time `serve_https.py` is run.

### ML model files (`*.pkl`)

The trained scikit-learn model files are excluded from version control (large binary files). A downloadable ZIP is provided via `public/PulseML_Models.zip` for users who wish to inspect or retrain the model.

---

## Recommended hardening steps before going fully public

### 1 — Restrict the Firebase API key to your domain

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Click on the API key used by PulseML.
3. Under **Application restrictions** → select **HTTP referrers**.
4. Add: `https://pulseml-ai.web.app/*` and `https://pulseml-ai.firebaseapp.com/*`.
5. Save. The key will now be rejected by Google if used from any other origin.

### 2 — Restrict authorised sign-in domains

1. Go to **Firebase Console → Authentication → Settings → Authorised domains**.
2. Remove `localhost` if you do not need it in production.
3. Ensure only `pulseml-ai.web.app` is listed.

### 3 — Enable Firebase App Check (optional but recommended)

App Check prevents automated scripts from calling your Firestore even with a valid key.

1. Firebase Console → **App Check** → Register your web app.
2. Select **reCAPTCHA v3** as the provider.
3. Enforce App Check on Firestore in the Firebase Console.

---

## Reporting a vulnerability

If you discover a genuine security issue (e.g. a Firestore rule misconfiguration that allows unauthorised reads), please open a GitHub Issue marked **[SECURITY]** or contact the repository maintainer directly. Do not publicly disclose the issue until it has been addressed.
