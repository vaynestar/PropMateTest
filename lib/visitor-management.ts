import prisma from "./prisma";

export async function getVisitorsByLease(leaseId: string) {
  try {
    const visitors = await prisma.visitor.findMany({
      where: { lease_id: leaseId },
      orderBy: { visit_date: "desc" },
    });
    return visitors;
  } catch (error) {
    console.error("Failed to fetch visitors:", error);
    throw new Error("Failed to fetch visitors");
  }
}

export async function getAllVisitors(propertyId?: string) {
  try {
    const visitors = await prisma.visitor.findMany({
      where: propertyId ? { lease: { unit: { property_id: propertyId } } } : undefined,
      orderBy: { visit_date: "desc" },
      include: {
        lease: {
          include: {
            unit: true,
            tenant: {
              select: { user_name: true }
            }
          }
        }
      }
    });
    return visitors;
  } catch (error) {
    console.error("Failed to fetch all visitors:", error);
    throw new Error("Failed to fetch visitors");
  }
}

export async function createVisitor(data: {
  lease_id: string;
  visitor_name: string;
  visitor_ic_no: string;
  vehicle_plate?: string;
  visit_purpose?: string;
  visit_date: string;
}) {
  try {
    const visitor = await prisma.visitor.create({
      data: {
        lease_id: data.lease_id,
        visitor_name: data.visitor_name,
        visitor_ic_no: data.visitor_ic_no,
        vehicle_plate: data.vehicle_plate,
        visit_purpose: data.visit_purpose,
        visit_date: new Date(data.visit_date),
        status: "Pending",
      },
    });
    return visitor;
  } catch (error) {
    console.error("Failed to create visitor:", error);
    throw new Error("Failed to create visitor");
  }
}
