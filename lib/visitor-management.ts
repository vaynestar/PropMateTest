import prisma from "./prisma";

export async function getVisitorsByLease(leaseId: string) {
  try {
    const visitors = await prisma.visitor.findMany({
      where: { lease_id: leaseId },
      orderBy: [{ visit_date: "desc" }, { created_at: "desc" }],
      include: {
        property: true,
        lease: {
          include: {
            unit: true,
            tenant: { select: { user_name: true, phone_number: true } },
          },
        },
      },
    });
    return visitors;
  } catch (error) {
    console.error("Failed to fetch visitors by lease:", error);
    throw new Error("Failed to fetch visitors");
  }
}

export async function getAllVisitors(propertyId?: string) {
  try {
    const visitors = await prisma.visitor.findMany({
      where: propertyId
        ? {
            OR: [
              { property_id: propertyId },
              { lease: { unit: { property_id: propertyId } } },
            ],
          }
        : undefined,
      orderBy: [{ visit_date: "desc" }, { created_at: "desc" }],
      include: {
        property: { select: { property_id: true, property_name: true } },
        // The gate log. The columns on Visitor say where someone is now; this
        // says what happened and who recorded it, and survives corrections.
        movements: {
          orderBy: { occurred_at: "desc" },
          take: 10,
          select: {
            movement_id: true,
            direction: true,
            occurred_at: true,
            method: true,
            recorder: { select: { user_name: true } },
          },
        },
        lease: {
          select: {
            lease_id: true,
            // AGENTS.md Rule 6: `unit: { include: { property: true } }` pulled
            // the whole Unit across to the client with area_sqft and
            // monthly_rent still Decimal. The list needs a unit number and a
            // property name.
            unit: {
              select: {
                unit_id: true,
                unit_number: true,
                property_id: true,
                property: { select: { property_id: true, property_name: true } },
              },
            },
            tenant: {
              select: { user_name: true, phone_number: true },
            },
          },
        },
      },
    });
    return visitors;
  } catch (error) {
    console.error("Failed to fetch all visitors:", error);
    throw new Error("Failed to fetch visitors");
  }
}

export async function createVisitor(data: {
  property_id?: string;
  lease_id?: string | null;
  visitor_type?: string;
  visitor_name: string;
  visitor_ic_no: string;
  contact_no?: string;
  vehicle_plate?: string;
  visit_purpose?: string;
  destination?: string;
  visit_date: string;
  status?: string;
  created_by?: string;
}) {
  try {
    const visitor = await prisma.visitor.create({
      data: {
        property_id: data.property_id || undefined,
        lease_id: data.lease_id || undefined,
        visitor_type: data.visitor_type || "Resident Guest",
        visitor_name: data.visitor_name,
        visitor_ic_no: data.visitor_ic_no,
        contact_no: data.contact_no,
        vehicle_plate: data.vehicle_plate,
        visit_purpose: data.visit_purpose,
        destination: data.destination,
        visit_date: new Date(data.visit_date),
        status: data.status || "Pending",
        created_by: data.created_by,
      },
    });
    return visitor;
  } catch (error) {
    console.error("Failed to create visitor:", error);
    throw new Error("Failed to create visitor");
  }
}
