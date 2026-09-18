/**
 * Security headers for files PropMate serves back (receipts, announcement
 * attachments, facility and helpdesk photos). The type was already decided
 * from the file's bytes (JPG/PNG/PDF only) and `nosniff` stops the browser
 * guessing otherwise.
 *
 * `sandbox` stays for images. PDFs drop it (DEV-190): Chrome refuses to show a
 * sandboxed PDF inside the in-app viewer, and a PDF viewer is not a page that
 * can run our origin's scripts.
 */
export function fileSecurityHeaders(contentType: string): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy":
      contentType === "application/pdf"
        ? "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'"
        : "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'",
  };
}
