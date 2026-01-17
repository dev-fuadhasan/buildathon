import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import {
  getDoctorBookings,
  getConsultationBooking,
  updateConsultationBooking,
  getTimeSlot,
} from "@/lib/timeSlots";
import { saveNotification } from "@/lib/data";
import { v4 as uuid } from "uuid";

// GET: List all bookings for the doctor
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const fromDate = searchParams.get("fromDate") || undefined;

    const bookings = await getDoctorBookings(user.id, { status, fromDate });

    // Enrich with mother info and time slot details
    const { listAllMothers } = await import("@/lib/data");
    const { getTimeSlot } = await import("@/lib/timeSlots");
    const allMothers = await listAllMothers();

    const enriched = await Promise.all(
      bookings.map(async (booking) => {
        const mother = allMothers.find((m) => m.id === booking.motherId);
        const timeSlot = await getTimeSlot(booking.timeSlotId);
        
        return {
          ...booking,
          mother: mother
            ? {
                name: mother.name,
                email: mother.email,
                age: mother.age,
                phone: mother.phone,
              }
            : null,
          timeSlot: timeSlot
            ? {
                date: timeSlot.date,
                startTime: timeSlot.startTime,
                endTime: timeSlot.endTime,
              }
            : null,
        };
      })
    );

    return NextResponse.json({ bookings: enriched });
  } catch (error: any) {
    console.error("[API] Error fetching doctor bookings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

// PATCH: Approve or reject a booking
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { bookingId, status, rejectionReason } = body;

    if (!bookingId || !status) {
      return NextResponse.json(
        { error: "Booking ID and status are required" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    // Get the booking to verify ownership
    const booking = await getConsultationBooking(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.doctorId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (booking.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending bookings can be approved/rejected" },
        { status: 400 }
      );
    }

    // Update booking status
    const updates: any = { status };
    if (status === "rejected" && rejectionReason) {
      updates.cancellationReason = rejectionReason;
    }

    const updatedBooking = await updateConsultationBooking(bookingId, updates);

    // Send notification to mother
    const { getMother, getDoctor } = await import("@/lib/data");
    const mother = await getMother(booking.motherId);
    const doctor = await getDoctor(booking.doctorId);
    const timeSlot = await getTimeSlot(booking.timeSlotId);

    if (mother) {
      const notificationId = uuid();
      await saveNotification({
        id: notificationId,
        motherId: mother.id,
        type: status === "approved" ? "booking_approved" : "booking_rejected",
        title:
          status === "approved"
            ? "Consultation Booking Approved"
            : "Consultation Booking Rejected",
        message:
          status === "approved"
            ? `Dr. ${doctor?.name || "Your doctor"} has approved your consultation booking for ${timeSlot?.date} at ${timeSlot?.startTime?.slice(0, 5)}.`
            : `Dr. ${doctor?.name || "Your doctor"} has rejected your consultation booking. ${rejectionReason || ""}`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }

    return NextResponse.json({
      booking: updatedBooking,
      message: `Booking ${status} successfully`,
    });
  } catch (error: any) {
    console.error("[API] Error updating booking:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update booking" },
      { status: 500 }
    );
  }
}
