import "server-only";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { PROPERTY_COOKIE, resolveActivePropertyId } from "./property-context";

/**
 * The active property for the current request, for use in any admin Server
 * Component. Applies the one shared precedence rule:
 *
 *   ?property= deep link → user cookie → is_default → first property
 *
 * Before DEV-129 every module read the cookie raw and inline. That meant no
 * validity check (a stale id for a deleted property silently scoped a page to
 * nothing), no is_default fallback, and no agreement with the top-bar
 * switcher. Call this instead of reading the cookie directly.
 */
export async function getActivePropertyId(
  urlValue?: string | null
): Promise<string | null> {
  const [jar, properties] = await Promise.all([
    cookies(),
    prisma.propertyMaster.findMany({
      select: { property_id: true, is_default: true },
      orderBy: { created_at: "asc" },
    }),
  ]);

  return resolveActivePropertyId(properties, jar.get(PROPERTY_COOKIE)?.value, urlValue);
}
