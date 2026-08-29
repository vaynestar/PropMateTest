import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "announcements";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate size (default max 10MB)
    const maxSizeMbParam = await prisma.appParameter.findUnique({
      where: { param_key: "ANNOUNCEMENT_IMAGE_MAX_SIZE_MB" },
    });
    const maxBytes = (parseInt(maxSizeMbParam?.param_value || "10", 10)) * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File exceeds maximum allowed size of ${maxSizeMbParam?.param_value || "10"}MB` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${Date.now()}_${cleanFileName}`;

    // Target upload directory in public/uploads/<folder>
    const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, uniqueFileName);
    await fs.writeFile(filePath, buffer);

    // Fetch storage settings from AppParameter
    const prefixParam = await prisma.appParameter.findUnique({
      where: { param_key: "FIREBASE_STORAGE_URL_PREFIX" },
    });

    const localUrl = `/uploads/${folder}/${uniqueFileName}`;
    const storageUrl = prefixParam?.param_value
      ? `${prefixParam.param_value}${folder}%2F${encodeURIComponent(uniqueFileName)}?alt=media`
      : localUrl;

    return NextResponse.json({
      success: true,
      url: localUrl,
      firebaseUrl: storageUrl,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error: any) {
    console.error("Upload handler error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process uploaded file" },
      { status: 500 }
    );
  }
}
