# AISF Student Portal

A React + TypeScript student registration, approval, and private media portal using Firebase Authentication, Cloud Firestore, and Firebase Storage.

## Local setup

1. In Firebase Console, create a project and register a **Web app**. Do not put service-account credentials in the client.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Create a Cloud Firestore database in the project. Firebase Storage uploads are disabled by default; do not enable them until billing and a Storage bucket are configured.
4. Copy `.env.example` to `.env` and fill in the web-app configuration from **Project settings → Your apps → SDK setup and configuration**:

   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_STORAGE_ENABLED=false`
   - `VITE_FIREBASE_STORAGE_BUCKET` (only needed when activating Storage)

5. Install and start the app:

   ```sh
   npm install
   npm run dev
   ```

The Firebase web configuration is public client configuration, not an authorization boundary. Firestore and Storage rules enforce access. Never add Admin SDK credentials to `.env` or browser code.

## Rules deployment

Select the Firebase project first, then deploy Firestore rules:

```sh
npx firebase-tools login
npx firebase-tools use --add
npx firebase-tools deploy --only firestore:rules --project YOUR_FIREBASE_PROJECT_ID
```

Review the selected project before deployment. `firebase.json` points the CLI at `firestore.rules` and `storage.rules`. Only after enabling the required Firebase billing plan, provisioning a Storage bucket, and reviewing the existing restrictive rules should you deploy the Storage rules:

```sh
npx firebase-tools deploy --only storage --project YOUR_FIREBASE_PROJECT_ID
```

Keep `VITE_FIREBASE_STORAGE_ENABLED=false` until the bucket and Storage Security Rules are configured and verified. To activate uploads later, set it to `true` in the deployment environment and rebuild. The application rejects uploads at the shared upload service while this flag is not explicitly `true`.

## Provision the first administrator

Admin registration is not part of the website. Create the administrator user manually in **Firebase Console → Authentication → Users → Add user**. From a trusted operator machine with Firebase Admin SDK Application Default Credentials configured for the same project, assign the custom claim:

```sh
gcloud auth application-default login
$env:GOOGLE_CLOUD_PROJECT="YOUR_FIREBASE_PROJECT_ID"
npm run set-admin -- FIREBASE_AUTH_USER_UID
```

The script merges the `admin: true` claim with existing claims for that user. The admin must sign out and sign in again after claim assignment. Keep operator credentials private and never grant this claim from the client.

## Security behavior

- New accounts are student-only. The client creates a profile with `role: student` and `status: pending`; Firestore rules enforce those initial values.
- Student profile fields other than `status` cannot be changed by the account owner. Only a token carrying the trusted `admin: true` custom claim can change approval status.
- Admin routes check the custom claim, while Firestore and Storage rules independently enforce authorization.
- Only approved students can upload or read their own media. Admins can read and delete uploads.
- Images are limited to 10 MiB and JPEG, PNG, or WEBP. Videos are limited to 50 MiB and MP4, MOV/QuickTime, or WEBM.
- Upload controls display a Storage-unavailable notification and make no upload request while `VITE_FIREBASE_STORAGE_ENABLED` is false or unset.
- Upload records retain the Storage download URL as requested. Firebase download-token URLs are bearer links: anyone who obtains a tokenized URL can use it outside these app rules. Do not distribute those URLs publicly; for stronger revocable link isolation, serve media through a trusted authenticated backend rather than exposing download-token URLs.

## Validation

```sh
npm run typecheck
npm run build
```

To exercise the full registration, approval, and media workflow, configure a Firebase project and deploy both rules first. The app does not ship with fabricated Firebase credentials or bypass security when configuration is absent.
