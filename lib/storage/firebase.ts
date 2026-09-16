import "server-only";
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

/**
 * Firebase Storage, server side only.
 *
 * The bucket's security rules deny all client access; the browser never talks
 * to Firebase. PropMate uploads with a service account and hands files back
 * only after its own permission checks. Vercel's disk does not persist, which
 * is why files cannot simply be written under public/.
 *
 * Env (set by the account owner - never commit or log them):
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY,
 *   FIREBASE_STORAGE_BUCKET  (e.g. propmate-xxxxx.firebasestorage.app)
 */

/**
 * A service-account private key survives copy-paste in several shapes: with
 * literal "\n" escapes (as in the JSON file), with real newlines, or squashed
 * onto one line with the breaks lost. Rebuild a valid PEM from any of them.
 */
export function normalisePrivateKey(raw: string): string {
  let key = raw.trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  if (key.includes("\n")) return key;

  const header = "-----BEGIN PRIVATE KEY-----";
  const footer = "-----END PRIVATE KEY-----";
  const body = key.replace(header, "").replace(footer, "").replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g) ?? [];
  key = [header, ...lines, footer, ""].join("\n");
  return key;
}

export function firebaseStorageConfigured() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_STORAGE_BUCKET
  );
}

function app() {
  if (getApps().length) return getApp();
  if (!firebaseStorageConfigured()) {
    throw new Error("Firebase Storage is not configured (FIREBASE_* environment variables missing).");
  }
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: normalisePrivateKey(process.env.FIREBASE_PRIVATE_KEY!),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET!.replace(/^gs:\/\//, ""),
  });
}

export function bucket() {
  return getStorage(app()).bucket();
}

export async function putObject(path: string, bytes: Uint8Array, contentType: string) {
  await bucket().file(path).save(Buffer.from(bytes), {
    contentType,
    resumable: false,
    metadata: { cacheControl: "private, max-age=0" },
  });
}

export async function getObject(path: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  const file = bucket().file(path);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [[bytes], [meta]] = await Promise.all([file.download(), file.getMetadata()]);
  return { bytes, contentType: String(meta.contentType ?? "application/octet-stream") };
}

export async function deleteObject(path: string) {
  await bucket().file(path).delete({ ignoreNotFound: true });
}
