/**
 * Upload size limit shared by browser and server. Vercel rejects any request
 * body over 4.5 MB before our code runs, so 4 MB leaves room for the form.
 */
export const UPLOAD_LIMIT_BYTES = 4 * 1024 * 1024;

/** One wording everywhere (user, 2026-09-17). */
export const FILE_TOO_LARGE_MESSAGE =
  "This file is over 4 MB and couldn't be made smaller. Please reduce its size and upload it again.";
