import prisma from "@/lib/prisma";

/**
 * Storage folder masterfile (user, 2026-09-16): *"I need a manual param
 * masterfile, to define where these picture saving to which folder"*.
 *
 * One row per kind of upload, kept in app_parameters and edited under
 * Settings -> Cloud & Storage. A change applies to new uploads only - every
 * stored file keeps the full path it was saved under, so nothing moves or
 * breaks when a folder is renamed.
 *
 * Folder names never decide who may read a file: announcement files are
 * served only when an announcement uses them, and receipts only through the
 * ownership-checked proof route.
 */

export type StoragePurpose = "announcement_image" | "announcement_attachment" | "facility_image" | "ticket_attachment" | "payment_receipt";

export const STORAGE_PURPOSES: Record<
  StoragePurpose,
  { key: string; label: string; defaultFolder: string; accepts: string }
> = {
  announcement_image: {
    key: "STORAGE_FOLDER_ANNOUNCEMENT_IMAGE",
    label: "Announcement photos",
    defaultFolder: "announcements",
    accepts: "JPG, JPEG, PNG",
  },
  announcement_attachment: {
    key: "STORAGE_FOLDER_ANNOUNCEMENT_ATTACHMENT",
    label: "Announcement attachments (circulars)",
    defaultFolder: "circulars",
    accepts: "PDF, JPG, JPEG, PNG",
  },
  facility_image: {
    key: "STORAGE_FOLDER_FACILITY_IMAGE",
    label: "Facility photos",
    defaultFolder: "facilities",
    accepts: "JPG, JPEG, PNG",
  },
  ticket_attachment: {
    key: "STORAGE_FOLDER_TICKET_ATTACHMENT",
    label: "Helpdesk photos",
    defaultFolder: "tickets",
    accepts: "JPG, JPEG, PNG",
  },
  payment_receipt: {
    key: "STORAGE_FOLDER_PAYMENT_RECEIPT",
    label: "Payment receipts",
    defaultFolder: "receipts",
    accepts: "PDF, JPG, JPEG, PNG",
  },
};

export const STORAGE_PURPOSE_ORDER: StoragePurpose[] = [
  "announcement_image",
  "announcement_attachment",
  "facility_image",
  "ticket_attachment",
  "payment_receipt",
];

/**
 * Lowercase letters, digits, "-" and "_", up to three levels deep
 * (e.g. "notices/photos"). No leading or trailing slash, no "..", no spaces -
 * a folder name must never be able to reach outside its own place.
 */
const FOLDER = /^[a-z0-9][a-z0-9_-]{0,39}(\/[a-z0-9][a-z0-9_-]{0,39}){0,2}$/;

export function normaliseFolder(v: string) {
  return v.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
}

export function folderProblem(v: string): string | null {
  if (!v) return "can't be empty";
  if (!FOLDER.test(v)) {
    return "use lowercase letters, numbers, - or _, with up to 3 levels separated by /";
  }
  return null;
}

/** Two purposes may not share a folder, or sit one inside the other. */
export function foldersClash(a: string, b: string) {
  return a === b || a.startsWith(b + "/") || b.startsWith(a + "/");
}

export async function getStorageFolders(): Promise<Record<StoragePurpose, string>> {
  const rows = await prisma.appParameter.findMany({
    where: { param_key: { in: STORAGE_PURPOSE_ORDER.map((p) => STORAGE_PURPOSES[p].key) } },
    select: { param_key: true, param_value: true },
  });
  const out = {} as Record<StoragePurpose, string>;
  for (const p of STORAGE_PURPOSE_ORDER) {
    const raw = rows.find((r) => r.param_key === STORAGE_PURPOSES[p].key)?.param_value ?? "";
    const v = normaliseFolder(raw);
    // A bad value in the table falls back to the default rather than failing uploads.
    out[p] = folderProblem(v) ? STORAGE_PURPOSES[p].defaultFolder : v;
  }
  return out;
}

export async function getStorageFolder(purpose: StoragePurpose) {
  return (await getStorageFolders())[purpose];
}

/**
 * Validate a full set of folder edits from Settings. Returns the cleaned
 * values, or a message naming the row that's wrong.
 */
export function validateStorageFolders(
  input: Partial<Record<StoragePurpose, string>>
): { ok: true; folders: Record<StoragePurpose, string> } | { ok: false; error: string } {
  const folders = {} as Record<StoragePurpose, string>;
  for (const p of STORAGE_PURPOSE_ORDER) {
    const v = normaliseFolder(input[p] ?? STORAGE_PURPOSES[p].defaultFolder);
    const problem = folderProblem(v);
    if (problem) return { ok: false, error: `${STORAGE_PURPOSES[p].label}: folder ${problem}.` };
    folders[p] = v;
  }
  for (let i = 0; i < STORAGE_PURPOSE_ORDER.length; i++) {
    for (let j = i + 1; j < STORAGE_PURPOSE_ORDER.length; j++) {
      const a = STORAGE_PURPOSE_ORDER[i];
      const b = STORAGE_PURPOSE_ORDER[j];
      if (foldersClash(folders[a], folders[b])) {
        return {
          ok: false,
          error: `${STORAGE_PURPOSES[a].label} and ${STORAGE_PURPOSES[b].label} need separate folders.`,
        };
      }
    }
  }
  return { ok: true, folders };
}
