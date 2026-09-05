/**
 * Universal active-property context — one resolver for every admin surface.
 *
 * The top-bar PropertySwitcher and each module MUST agree on which property is
 * active, otherwise the header says one thing and the list shows another.
 * Import `resolveActivePropertyId` rather than re-deriving it per page.
 *
 * Precedence:
 *   1. `?property=` in the URL — a deep link such as "View units" from a
 *      property card. Highest, so cross-module navigation lands where intended.
 *   2. The user's `propmate_property_id` cookie — what they last chose in the
 *      top bar. This is the everyday case.
 *   3. The property flagged `is_default` — the starting point for a user who
 *      has not chosen yet.
 *   4. The first property.
 *
 * Note on (2) vs (3): the default is a *starting* value, not a lock. Resolving
 * the default ahead of the cookie pins the switcher to it permanently — picking
 * another property writes the cookie, the layout re-renders, and the default
 * wins again, so the control looks broken. Fixed in DEV-128.
 */

export const PROPERTY_COOKIE = "propmate_property_id";

export type PropertyLike = {
  property_id: string;
  property_name?: string;
  is_default?: boolean | null;
};

export function resolveActivePropertyId(
  properties: PropertyLike[],
  cookieValue?: string | null,
  urlValue?: string | null
): string | null {
  const exists = (id?: string | null) =>
    !!id && properties.some((p) => p.property_id === id);

  if (exists(urlValue)) return urlValue as string;
  if (exists(cookieValue)) return cookieValue as string;

  const fallback = properties.find((p) => p.is_default) ?? properties[0];
  return fallback?.property_id ?? null;
}

/** True when the cookie does not already hold the resolved id and should be updated. */
export function shouldPersistProperty(
  resolvedId: string | null,
  cookieValue?: string | null
): boolean {
  return !!resolvedId && cookieValue !== resolvedId;
}
