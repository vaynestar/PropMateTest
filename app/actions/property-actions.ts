"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setActiveProperty(propertyId: string) {
  const cookieStore = await cookies();
  cookieStore.set("propmate_property_id", propertyId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  
  // Revalidate the entire admin section so data is re-fetched for the new property
  revalidatePath("/admin", "layout");
}

export async function setDefaultPropertyAction(propertyId: string | null) {
  const prisma = (await import("@/lib/prisma")).default;

  // Reset all properties default flag
  await prisma.propertyMaster.updateMany({
    data: { is_default: false },
  });

  if (propertyId) {
    await prisma.propertyMaster.update({
      where: { property_id: propertyId },
      data: { is_default: true },
    });
  }

  revalidatePath("/admin", "layout");
}
