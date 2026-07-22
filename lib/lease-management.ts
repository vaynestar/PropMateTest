import prisma from "./prisma";

export async function getAllLeases(
  propertyId?: string,
  tenantId?: string,
  search?: string,
  includePrevious: boolean = true,
  unitNumber?: string
) {
  try {
    const whereClause: any = {};
    if (propertyId) {
      whereClause.unit = { property_id: propertyId };
    }
    if (unitNumber) {
      whereClause.unit = {
        ...(whereClause.unit || {}),
        unit_number: { contains: unitNumber, mode: "insensitive" }
      };
    }
    if (tenantId) {
      whereClause.user_id = tenantId;
    }
    if (!includePrevious) {
      whereClause.status = "Active";
    }
    if (search) {
      whereClause.OR = [
        { tenant: { user_name: { contains: search, mode: "insensitive" } } },
        { tenant: { user_email: { contains: search, mode: "insensitive" } } },
        { tenant: { phone_number: { contains: search, mode: "insensitive" } } },
        { unit: { unit_number: { contains: search, mode: "insensitive" } } },
      ];
    }
    const leases = await prisma.tenantLease.findMany({
      where: whereClause,
      include: {
        unit: {
          include: { property: true }
        },
        tenant: {
          select: { user_id: true, user_name: true, user_email: true, phone_number: true }
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

export async function updateLease(
  lease_id: string,
  data: {
    move_in_date: string;
    move_out_date?: string | null;
    status?: string;
  },
  modifiedBy: string
) {
  try {
    const existingLease = await prisma.tenantLease.findUnique({
      where: { lease_id },
      include: { unit: true }
    });

    if (!existingLease) {
      throw new Error("Lease not found");
    }

    const moveOutDate = data.move_out_date ? new Date(data.move_out_date) : null;
    
    // Auto status determination:
    // Adding a move_out_date automatically updates status to "Inactive"
    // Removing move_out_date restores status to "Active"
    let newStatus = data.status;
    if (data.move_out_date !== undefined) {
      if (moveOutDate) {
        newStatus = "Inactive";
      } else {
        newStatus = "Active";
      }
    }

    return await prisma.$transaction(async (tx) => {
      const updatedLease = await tx.tenantLease.update({
        where: { lease_id },
        data: {
          move_in_date: new Date(data.move_in_date),
          move_out_date: moveOutDate,
          status: newStatus || existingLease.status,
          modified_by: modifiedBy,
        },
      });

      // Update unit status based on lease status
      if (newStatus === "Active") {
        await tx.unit.update({
          where: { unit_id: existingLease.unit_id },
          data: { status: "Occupied" },
        });
      } else if (newStatus === "Inactive" || newStatus === "Expired" || newStatus === "Terminated") {
        // Check if there are other active leases for this unit
        const otherActive = await tx.tenantLease.findFirst({
          where: {
            unit_id: existingLease.unit_id,
            status: "Active",
            NOT: { lease_id }
          }
        });
        if (!otherActive) {
          await tx.unit.update({
            where: { unit_id: existingLease.unit_id },
            data: { status: "Vacant" },
          });
        }
      }

      return updatedLease;
    });
  } catch (error: any) {
    console.error("Failed to update lease:", error);
    throw new Error(error.message || "Failed to update lease");
  }
}
