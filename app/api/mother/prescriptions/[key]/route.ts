import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getJson, putJson } from "@/lib/r2Client";

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
