import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { searchAdmin } from "@/lib/admin-search";

/*
 * AGENTS.md Rule 5 — proxy.ts excludes /api/*, so this handler verifies the
 * session and the role itself. It reads across units, residents, invoices,
 * repairs and visitors, so an unauthenticated or resident caller here would
 * be a directory of every household in the building.
 *
 * The property scope comes from the cookie, not from a query parameter: a
 * caller must not be able to widen their own search past the property they
 * are looking at by editing the URL.
 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const q = new URL(request.url).searchParams.get("q") ?? "";
    const { cookies } = await import("next/headers");
    const propertyId = (await cookies()).get("propmate_property_id")?.value || null;

    const sections = await searchAdmin(q, propertyId);
    return NextResponse.json({ sections });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
