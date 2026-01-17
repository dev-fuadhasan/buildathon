import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getJson, putJson, deleteObject } from "@/lib/r2Client";

// Helper function to get prescription metadata
async function getPrescriptionMetadata(userId: string): Promise<Record<string, string>> {
  const metadataKey = `prescriptions/${userId}/metadata.json`;
  const metadata = await getJson<Record<string, string>>(metadataKey);
  return metadata || {};
}

// Helper function to save prescription metadata
async function savePrescriptionMetadata(userId: string, metadata: Record<string, string>) {
  const metadataKey = `prescriptions/${userId}/metadata.json`;
  await putJson(metadataKey, metadata);
}

// PATCH endpoint to rename a prescription
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key } = await params;
    const decodedKey = decodeURIComponent(key);
    
    // Verify the prescription belongs to this user
    if (!decodedKey.startsWith(`prescriptions/${user.id}/`)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { customName } = body;

    if (typeof customName !== "string") {
      return NextResponse.json(
        { error: "customName must be a string" },
        { status: 400 }
      );
    }

    // Validate custom name length
    if (customName.length > 100) {
      return NextResponse.json(
        { error: "Custom name must be 100 characters or less" },
        { status: 400 }
      );
    }

    // Load existing metadata
    const metadata = await getPrescriptionMetadata(user.id);
    
    // Update or remove custom name
    if (customName.trim() === "") {
      // Remove custom name (revert to default)
      delete metadata[decodedKey];
    } else {
      // Set custom name
      metadata[decodedKey] = customName.trim();
    }

    // Save updated metadata
    await savePrescriptionMetadata(user.id, metadata);

    return NextResponse.json({
      success: true,
      key: decodedKey,
      customName: customName.trim() === "" ? null : customName.trim(),
    });
  } catch (error: any) {
    console.error("Prescription rename error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to rename prescription" },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a prescription
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key } = await params;
    const decodedKey = decodeURIComponent(key);
    
    // Verify the prescription belongs to this user
    if (!decodedKey.startsWith(`prescriptions/${user.id}/`)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete the prescription file from R2
    await deleteObject(decodedKey);

    // Also delete associated page images if it's a PDF
    try {
      const { listObjects } = await import("@/lib/r2Client");
      const prefix = decodedKey.replace(/\.(pdf|jpg|jpeg|png)$/i, "");
      const objects = await listObjects(prefix);
      
      // Find page images (e.g., prescription_123_page1.jpg)
      const pageImages = objects.filter(obj => 
        obj.Key && obj.Key.match(/_page\d+\.(jpg|jpeg|png)$/i) && 
        obj.Key.startsWith(prefix)
      );
      
      // Delete all page images
      for (const pageImage of pageImages) {
        if (pageImage.Key) {
          try {
            await deleteObject(pageImage.Key);
          } catch (err) {
            console.error(`Failed to delete page image ${pageImage.Key}:`, err);
          }
        }
      }
    } catch (err) {
      console.error("Error deleting associated page images:", err);
      // Continue even if page image deletion fails
    }

    // Remove custom name from metadata if exists
    const metadata = await getPrescriptionMetadata(user.id);
    if (metadata[decodedKey]) {
      delete metadata[decodedKey];
      await savePrescriptionMetadata(user.id, metadata);
    }

    return NextResponse.json({
      success: true,
      message: "Prescription deleted successfully",
    });
  } catch (error: any) {
    console.error("Prescription delete error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete prescription" },
      { status: 500 }
    );
  }
}
