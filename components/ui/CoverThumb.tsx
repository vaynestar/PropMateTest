"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Stand-in covers for records that may be saved without a picture.
 * One per kind, because a notice and a swimming pool should not be
 * represented by the same drawing (DEV-255, DEV-257).
 */
export const DEFAULT_ANNOUNCEMENT_COVER = "/announcement-cover.svg";
export const DEFAULT_FACILITY_COVER = "/facility-cover.svg";

/**
 * One thumbnail for every list that shows an uploaded picture.
 *
 * Two faults it fixes wherever it is used. A card that renders its image only
 * when there is one makes a grid of different heights, and the eye has
 * nothing to track down a column. And every picture in PropMate is a Firebase
 * URL rendered `unoptimized`: when a file is deleted from the bucket the row
 * showed the browser's own broken-image glyph, which reads as PropMate being
 * broken rather than the picture being gone. `onError` catches that and falls
 * back to the same default.
 *
 * `broken` stores the URL that failed rather than a boolean, so repointing a
 * record at a working image recovers without remounting the row.
 */
export default function CoverThumb({
  src,
  alt,
  fallback = DEFAULT_ANNOUNCEMENT_COVER,
  className = "",
  sizes = "(max-width: 1024px) 100vw, 360px",
}: {
  src?: string | null;
  alt: string;
  /** The stand-in drawn when `src` is empty or fails to load. */
  fallback?: string;
  className?: string;
  sizes?: string;
}) {
  const [broken, setBroken] = useState<string | null>(null);
  const failed = !src || broken === src;
  const resolved = failed ? fallback : src!;

  return (
    <div className={`relative overflow-hidden bg-surface-container-lowest ${className}`}>
      <Image
        src={resolved}
        /* The default is decorative — it says nothing about this record, so a
           screen reader should skip it rather than read the heading twice. */
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
