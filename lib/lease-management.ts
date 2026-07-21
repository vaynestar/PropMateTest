import prisma from "./prisma";

export async function getAllLeases() {
  try {
    const leases = await prisma.tenantLease.findMany({
      include: {
        unit: {
          include: { property: true }
        },
        tenant: {
          select: { user_name: true, user_email: true, phone_number: true }
        }
      },
      orderBy: { created_at: "desc" },
    });
    return leases;
  } catch (error) {
    console.error("Failed to fetch leases:", error);
    throw new Error("Failed to fetch leases");
  }
}

export async function createLease(data: {
  unit_id: string;
  user_id: string;
  move_in_date: string;
  move_out_date?: string;
}, createdBy: string) {
  try {
    // Check if unit is already occupied
    const activeLease = await prisma.tenantLease.findFirst({
      where: { unit_id: data.unit_id, status: "Active" }
    });

    if (activeLease) {
      throw new Error("Unit is already leased to a tenant");
    }

    // Start a transaction: create lease and update unit status to Occupied
    return await prisma.$transaction(async (tx) => {
      const lease = await tx.tenantLease.create({
        data: {
          unit_id: data.unit_id,
          user_id: data.user_id,
          move_in_date: new Date(data.move_in_date),
          move_out_date: data.move_out_date ? new Date(data.move_out_date) : null,
          status: "Active",
          created_by: createdBy,
        },
      });

      await tx.unit.update({
        where: { unit_id: data.unit_id },
        data: { status: "Occupied" },
      });

      return lease;
    });
  } catch (error: any) {
    console.error("Failed to create lease:", error);
    throw new Error(error.message || "Failed to create lease");
  }
}
