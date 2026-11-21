import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const uid = process.argv[2];
if (!uid) {
  console.error("Usage: npm run set-admin -- <firebase-auth-uid>");
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault() });
}

try {
  const auth = getAuth();
  const user = await auth.getUser(uid);
  await auth.setCustomUserClaims(uid, { ...user.customClaims, admin: true });
  console.log(`Administrator claim assigned to ${user.email ?? uid}.`);
  console.log("The user must sign out and sign in again to refresh their ID token.");
} catch (error) {
  console.error("Unable to assign administrator claim:", error);
  process.exitCode = 1;
}
