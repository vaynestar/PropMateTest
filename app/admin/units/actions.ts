"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createUnit, deleteUnit } from "@/lib/unit-management";

export async function addUnit(state: any, formData: FormData) {
  try {
    await requireUser(["Admin"]);
    
    const property_id = formData.get("property_id") as string || null;
    const unit_type = String(formData.get("unit_type") || "Standard");
    const floor_number = String(formData.get("floor_number"));
    const area_sqft = String(formData.get("area_sqft"));
    const status = String(formData.get("status"));
    const mode = String(formData.get("creation_mode"));

    let count = 0;

    if (mode === "single") {
      const unit_number = String(formData.get("unit_number"));
      if (!unit_number) throw new Error("Unit Number is required.");
      
      await createUnit({
        property_id,
        unit_number,
        unit_type,
        floor_number,
        area_sqft,
        monthly_rent: "0",
        status,
      });
      count = 1;
    } else {
      const prefix = String(formData.get("unit_prefix") || "");
      const startStr = String(formData.get("start_number") || "1");
      const endStr = String(formData.get("end_number") || "1");
      
      const startNum = parseInt(startStr, 10);
      const endNum = parseInt(endStr, 10);
      
      if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) {
        throw new Error("Invalid start or end number range.");
      }
      
      const padLength = Math.max(startStr.length, endStr.length);
      
      for (let i = startNum; i <= endNum; i++) {
        const paddedNum = i.toString().padStart(padLength, "0");
        const unitNumber = `${prefix}${paddedNum}`;
        
        await createUnit({
          property_id,
          unit_number: unitNumber,
          unit_type,
          floor_number,
          area_sqft,
          monthly_rent: "0",
          status,
        });
        count++;
      }
    }

    revalidatePath("/admin/units");
    return { success: true, message: `Successfully ${mode === "single" ? "added" : "generated"} ${count} unit${count === 1 ? '' : 's'}!` };
  } catch (error: any) {
    return { error: error.message || "Failed to add unit" };
  }
}

export async function removeUnit(state: any, formData: FormData) {
  try {
    await requireUser(["Admin"]);
    const unitId = String(formData.get("unit_id"));
    if (unitId) {
      await deleteUnit(unitId);
    }
    revalidatePath("/admin/units");
    return { success: true, message: "Unit deleted successfully!" };
  } catch (error: any) {
    return { error: error.message || "Failed to delete unit" };
  }
}

export async function updateUnitStatusAction(state: any, formData: FormData) {
  try {
    await requireUser(["Admin"]);
    const unitId = String(formData.get("unit_id"));
    const status = String(formData.get("status"));

    if (!unitId || !status) {
      throw new Error("Unit ID and status are required.");
    }

    await prisma.unit.update({
      where: { unit_id: unitId },
      data: { status },
    });

    revalidatePath("/admin/units");
    revalidatePath("/admin/leases");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to update unit status" };
  }
}
