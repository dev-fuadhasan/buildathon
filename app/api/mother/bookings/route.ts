import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import {
  getAvailableTimeSlots,
  createConsultationBooking,
  getMotherBookings,
  getConsultationBooking,
  updateConsultationBooking,
  getTimeSlot,
} from "@/lib/timeSlots";
import { saveNotification, findConsultationByReference } from "@/lib/data";
import { v4 as uuid } from "uuid";

// GET: Get mother's bookings OR available time slots for a doctor
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId");

    // If doctorId is provided, return available time slots for that doctor
    if (doctorId) {
      const fromDate = searchParams.get("fromDate") || undefined;
      const timeSlots = await getAvailableTimeSlots(doctorId, fromDate);

      // Enrich with doctor info
      const { getDoctor } = await import("@/lib/data");
      const doctor = await getDoctor(doctorId);

      return NextResponse.json({
        timeSlots,
        doctor: doctor
          ? {
              name: doctor.name,
              specialty: doctor.specialty,
              email: doctor.email,
            }
          : null,
      });
    }

    // Otherwise, return mother's bookings
    const bookings = await getMotherBookings(user.id);

    // Enrich with doctor info and time slot details
    const { listAllDoctors } = await import("@/lib/data");
    const allDoctors = await listAllDoctors();

    const enriched = await Promise.all(
      bookings.map(async (booking) => {
        const doctor = allDoctors.find((d) => d.id === booking.doctorId);
        const timeSlot = await getTimeSlot(booking.timeSlotId);

        return {
          ...booking,
          doctor: doctor
            ? {
                name: doctor.name,
                specialty: doctor.specialty,
                email: doctor.email,
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
    console.error("[API] Error fetching bookings/slots:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch data" },
      { status: 500 }
    );
  }
}

// POST: Create a new booking
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      timeSlotId,
      doctorId,
      issueDescription,
      additionalNotes,
      consultationId,
    } = body;

    // Validation
    if (!timeSlotId || !doctorId || !issueDescription) {
      return NextResponse.json(
        { error: "Time slot, doctor, and issue description are required" },
        { status: 400 }
      );
    }

    if (issueDescription.trim().length < 10) {
      return NextResponse.json(
        { error: "Please provide a detailed description (at least 10 characters)" },
        { status: 400 }
      );
    }

    // Verify time slot exists and is available
    const timeSlot = await getTimeSlot(timeSlotId);
    if (!timeSlot) {
      return NextResponse.json(
        { error: "Time slot not found" },
        { status: 404 }
      );
    }

    if (timeSlot.status !== "available") {
      return NextResponse.json(
        { error: "This time slot is no longer available" },
        { status: 400 }
      );
    }

    if (timeSlot.doctorId !== doctorId) {
      return NextResponse.json(
        { error: "Time slot does not belong to this doctor" },
        { status: 400 }
      );
    }

    // Check if slot is in the past
    const slotDateTime = new Date(`${timeSlot.date}T${timeSlot.startTime}`);
    if (slotDateTime < new Date()) {
      return NextResponse.json(
        { error: "Cannot book past time slots" },
        { status: 400 }
      );
    }

    // Check if mother already has a booking for this slot
    const existingBookings = await getMotherBookings(user.id);
    const duplicateBooking = existingBookings.find(
      (b) =>
        b.timeSlotId === timeSlotId &&
        ["pending", "approved"].includes(b.status)
    );

    if (duplicateBooking) {
      return NextResponse.json(
        { error: "You already have a booking for this time slot" },
        { status: 400 }
      );
    }

    // Create booking
    const booking = await createConsultationBooking({
      timeSlotId,
      doctorId,
      motherId: user.id,
      consultationId,
      issueDescription: issueDescription.trim(),
      additionalNotes: additionalNotes?.trim(),
      status: "pending",
    });

    // TODO: Add doctor notifications when doctor notification system is implemented
    // For now, only mother notifications are supported

    return NextResponse.json(
      {
        booking,
        message: "Booking request sent successfully. Please wait for doctor's approval.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API] Error creating booking:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create booking" },
      { status: 500 }
    );
  }
}

// PATCH: Cancel a booking (mother can cancel pending bookings)
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { bookingId, cancellationReason } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
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

    if (booking.motherId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!["pending", "approved"].includes(booking.status)) {
      return NextResponse.json(
        { error: "Only pending or approved bookings can be cancelled" },
        { status: 400 }
      );
    }

    // Update booking status
    const updatedBooking = await updateConsultationBooking(bookingId, {
      status: "cancelled",
      cancellationReason,
    });

    // TODO: Add doctor notifications when doctor notification system is implemented
    // For now, only mother notifications are supported

    return NextResponse.json({
      booking: updatedBooking,
      message: "Booking cancelled successfully",
    });
  } catch (error: any) {
    console.error("[API] Error cancelling booking:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel booking" },
      { status: 500 }
    );
  }
}
