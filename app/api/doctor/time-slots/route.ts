import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import {
  createTimeSlot,
  getDoctorTimeSlots,
  updateTimeSlot,
  deleteTimeSlot,
} from "@/lib/timeSlots";

// GET: List all time slots for the doctor
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;
    const status = searchParams.get("status") || undefined;

    const timeSlots = await getDoctorTimeSlots(user.id, {
      fromDate,
      toDate,
      status,
    });

    return NextResponse.json({ timeSlots });
  } catch (error: any) {
    console.error("[API] Error fetching time slots:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch time slots" },
      { status: 500 }
    );
  }
}

// POST: Create a new time slot
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      date,
      startTime,
      endTime,
      durationMinutes,
      maxBookings,
      slotType,
      notes,
    } = body;

    // Validation
    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Date, start time, and end time are required" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM or HH:MM:SS)
    const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: "Invalid time format. Use HH:MM or HH:MM:SS" },
        { status: 400 }
      );
    }

    // Ensure date is not in the past
    const slotDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (slotDate < today) {
      return NextResponse.json(
        { error: "Cannot create time slots in the past" },
        { status: 400 }
      );
    }

    // Normalize time format to HH:MM:SS
    const normalizedStartTime = startTime.length === 5 ? `${startTime}:00` : startTime;
    const normalizedEndTime = endTime.length === 5 ? `${endTime}:00` : endTime;

    const timeSlot = await createTimeSlot({
      doctorId: user.id,
      date,
      startTime: normalizedStartTime,
      endTime: normalizedEndTime,
      durationMinutes: durationMinutes || 30,
      maxBookings: maxBookings || 1,
      slotType: slotType || "consultation",
      notes,
    });

    return NextResponse.json(
      { timeSlot, message: "Time slot created successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API] Error creating time slot:", error);
    
    // Handle unique constraint violation
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return NextResponse.json(
        { error: "A time slot already exists at this time" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create time slot" },
      { status: 500 }
    );
  }
}

// PATCH: Update a time slot
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Time slot ID is required" },
        { status: 400 }
      );
    }

    // Normalize time formats if provided
    if (updates.startTime && updates.startTime.length === 5) {
      updates.startTime = `${updates.startTime}:00`;
    }
    if (updates.endTime && updates.endTime.length === 5) {
      updates.endTime = `${updates.endTime}:00`;
    }

    const timeSlot = await updateTimeSlot(id, updates);

    return NextResponse.json({
      timeSlot,
      message: "Time slot updated successfully",
    });
  } catch (error: any) {
    console.error("[API] Error updating time slot:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update time slot" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a time slot
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Time slot ID is required" },
        { status: 400 }
      );
    }

    await deleteTimeSlot(id);

    return NextResponse.json({
      message: "Time slot deleted successfully",
    });
  } catch (error: any) {
    console.error("[API] Error deleting time slot:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete time slot" },
      { status: 500 }
    );
  }
}
