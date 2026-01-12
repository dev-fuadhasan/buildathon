import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getPatient, savePatient, PatientData, PatientFile } from "@/lib/data";
import { uploadFile, signedUrl } from "@/lib/r2Client";
import { v4 as uuid } from "uuid";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { getDoctor } = await import("@/lib/data");
    const doctor = await getDoctor(user.id);
    if (!doctor || !doctor.hospitalClinicName) {
      return NextResponse.json({ error: "Hospital/Clinic name not found" }, { status: 400 });
    }

    if (doctor.role === "doctor") {
      return NextResponse.json({ error: "Only health workers can upload files" }, { status: 403 });
    }

    const patient = await getPatient(doctor.hospitalClinicName, id);
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const fileType = form.get("fileType") as string; // "prescription" | "report" | "document"
    const description = form.get("description") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!["prescription", "report", "document"].includes(fileType)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload PDF, PNG, or JPG files only." },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileId = uuid();
    const key = `patients/${encodeURIComponent(doctor.hospitalClinicName)}/${id}/${fileType}s/${fileId}-${sanitizedName}`;

    await uploadFile({
      key,
      body: buffer,
      contentType: file.type || "application/octet-stream",
    });

    const url = await signedUrl(key);
    const now = new Date().toISOString();

    const newFile: PatientFile = {
      id: fileId,
      key,
      url,
      fileName: file.name,
      fileType: fileType as "prescription" | "report" | "document",
      uploadedBy: user.id,
      uploadedByName: doctor.name,
      uploadedAt: now,
      description: description || undefined,
    };

    // Add file to patient's file list
    const updatedPatient: PatientData = {
      ...patient,
      prescriptions: fileType === "prescription" 
        ? [...(patient.prescriptions || []), newFile]
        : patient.prescriptions,
      reports: fileType === "report"
        ? [...(patient.reports || []), newFile]
        : patient.reports,
      documents: fileType === "document"
        ? [...(patient.documents || []), newFile]
        : patient.documents,
      updatedBy: user.id,
      updatedByName: doctor.name,
      updatedAt: now,
    };

    await savePatient(updatedPatient);

    // Trigger priority list update
    try {
      await fetch(`${req.nextUrl.origin}/api/nurse/update-priority`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalClinicName: doctor.hospitalClinicName }),
      });
    } catch (err) {
      console.error("Failed to trigger priority update:", err);
    }

    return NextResponse.json({ file: newFile });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { getDoctor } = await import("@/lib/data");
    const doctor = await getDoctor(user.id);
    if (!doctor || !doctor.hospitalClinicName) {
      return NextResponse.json({ error: "Hospital/Clinic name not found" }, { status: 400 });
    }

    if (doctor.role === "doctor") {
      return NextResponse.json({ error: "Only health workers can delete files" }, { status: 403 });
    }

    const patient = await getPatient(doctor.hospitalClinicName, id);
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");
    const fileType = searchParams.get("fileType") as "prescription" | "report" | "document";

    if (!fileId || !fileType) {
      return NextResponse.json({ error: "File ID and type are required" }, { status: 400 });
    }

    // Remove file from patient's file list
    const updatedPatient: PatientData = {
      ...patient,
      prescriptions: fileType === "prescription"
        ? (patient.prescriptions || []).filter((f) => f.id !== fileId)
        : patient.prescriptions,
      reports: fileType === "report"
        ? (patient.reports || []).filter((f) => f.id !== fileId)
        : patient.reports,
      documents: fileType === "document"
        ? (patient.documents || []).filter((f) => f.id !== fileId)
        : patient.documents,
      updatedBy: user.id,
      updatedByName: doctor.name,
      updatedAt: new Date().toISOString(),
    };

    await savePatient(updatedPatient);

    // Delete file from R2
    const fileToDelete = [
      ...(patient.prescriptions || []),
      ...(patient.reports || []),
      ...(patient.documents || []),
    ].find((f) => f.id === fileId);

    if (fileToDelete) {
      const { deleteObject } = await import("@/lib/r2Client");
      await deleteObject(fileToDelete.key);
    }

    // Trigger priority list update
    try {
      await fetch(`${req.nextUrl.origin}/api/nurse/update-priority`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalClinicName: doctor.hospitalClinicName }),
      });
    } catch (err) {
      console.error("Failed to trigger priority update:", err);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete file" },
      { status: 500 }
    );
  }
}

