import { initializeApp, getApps, getApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let initialized = false;

function ensureInit(): void {
  if (initialized) return;
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    });
  }
  initialized = true;
}

export async function verifyIdToken(token: string): Promise<{ uid: string } | null> {
  try {
    ensureInit();
    const decoded = await getAuth(getApp()).verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}
