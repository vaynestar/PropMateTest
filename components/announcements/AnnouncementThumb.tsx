"use client";

import Image from "next/image";
import { useState } from "react";

/** The stand-in cover for a notice posted without an image (DEV-255). */
export const DEFAULT_ANNOUNCEMENT_COVER = "/announcement-cover.svg";

/**
 * One thumbnail for the announcement listing.
 *
 * Two faults it fixes. The grid card rendered a cover only when `image_url`
 * was set, so a board of eight notices was eight different card heights and
 * the eye had nothing to track down the column. And covers are Firebase URLs:
 * when a file is deleted from the bucket the row rendered the browser's own
 * broken-image glyph, which looks like PropMate is broken rather than the
 * picture. `onError` catches that and falls back to the same default.
 *
 * `broken` stores the URL that failed rather than a boolean, so editing a
 * notice to point at a working image recovers without remounting the row.
 */
export default function AnnouncementThumb({
  src,
  alt,
  className = "",
  sizes = "(max-width: 1024px) 100vw, 360px",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  const [broken, setBroken] = useState<string | null>(null);
  const failed = !src || broken === src;
  const resolved = failed ? DEFAULT_ANNOUNCEMENT_COVER : src!;

  return (
    <div className={`relative overflow-hidden bg-surface-container-lowest ${className}`}>
      <Image
        src={resolved}
        /* The default is decorative — it says nothing about this notice, so a
           screen reader should skip it rather than read the headline twice. */
        alt={failed ? "" : alt}
        fill
        sizes={sizes}
        className="object-cover"
        unoptimized
        onError={() => src && setBroken(src)}
      />
    </div>
  );
}
