/**
 * Time Slots and Consultation Bookings Database Operations
 * Uses Supabase PostgreSQL for strong consistency
 */

import { createClient } from "@supabase/supabase-js";
import { TimeSlot, ConsultationBooking } from "./data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// TIME SLOTS
// ============================================

/**
 * Create a new time slot
 */
export async function createTimeSlot(timeSlot: Omit<TimeSlot, "id" | "createdAt" | "updatedAt" | "currentBookings" | "status">): Promise<TimeSlot> {
  const { data, error } = await supabase
    .from("time_slots")
    .insert({
      doctor_id: timeSlot.doctorId,
      date: timeSlot.date,
      start_time: timeSlot.startTime,
      end_time: timeSlot.endTime,
      duration_minutes: timeSlot.durationMinutes,
      max_bookings: timeSlot.maxBookings,
      slot_type: timeSlot.slotType || "consultation",
      notes: timeSlot.notes,
    })
    .select()
    .single();

  if (error) {
    console.error("[TimeSlots] Error creating time slot:", error);
    throw new Error(`Failed to create time slot: ${error.message}`);
  }

  return dbToTimeSlot(data);
}

/**
 * Get time slots for a doctor
 */
export async function getDoctorTimeSlots(
  doctorId: string,
  options?: {
    fromDate?: string;
    toDate?: string;
    status?: string;
  }
): Promise<TimeSlot[]> {
  let query = supabase
    .from("time_slots")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (options?.fromDate) {
    query = query.gte("date", options.fromDate);
  }
  if (options?.toDate) {
    query = query.lte("date", options.toDate);
  }
  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[TimeSlots] Error fetching doctor time slots:", error);
    throw new Error(`Failed to fetch time slots: ${error.message}`);
  }

  return (data || []).map(dbToTimeSlot);
}

/**
 * Get available time slots for a doctor (for patients to view)
 */
export async function getAvailableTimeSlots(
  doctorId: string,
  fromDate?: string
): Promise<TimeSlot[]> {
  const startDate = fromDate || new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("time_slots")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("status", "available")
    .gte("date", startDate)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("[TimeSlots] Error fetching available slots:", error);
    throw new Error(`Failed to fetch available slots: ${error.message}`);
  }

  return (data || []).map(dbToTimeSlot);
}

/**
 * Get a single time slot by ID
 */
export async function getTimeSlot(slotId: string): Promise<TimeSlot | null> {
  const { data, error } = await supabase
    .from("time_slots")
    .select("*")
    .eq("id", slotId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.error("[TimeSlots] Error fetching time slot:", error);
    throw new Error(`Failed to fetch time slot: ${error.message}`);
  }

  return dbToTimeSlot(data);
}

/**
 * Update a time slot
 */
export async function updateTimeSlot(
  slotId: string,
  updates: Partial<Omit<TimeSlot, "id" | "doctorId" | "createdAt" | "updatedAt">>
): Promise<TimeSlot> {
  const dbUpdates: any = {};
  
  if (updates.date) dbUpdates.date = updates.date;
  if (updates.startTime) dbUpdates.start_time = updates.startTime;
  if (updates.endTime) dbUpdates.end_time = updates.endTime;
  if (updates.durationMinutes) dbUpdates.duration_minutes = updates.durationMinutes;
  if (updates.maxBookings) dbUpdates.max_bookings = updates.maxBookings;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

  const { data, error } = await supabase
    .from("time_slots")
    .update(dbUpdates)
    .eq("id", slotId)
    .select()
    .single();

  if (error) {
    console.error("[TimeSlots] Error updating time slot:", error);
    throw new Error(`Failed to update time slot: ${error.message}`);
  }

  return dbToTimeSlot(data);
}

/**
 * Delete a time slot
 */
export async function deleteTimeSlot(slotId: string): Promise<void> {
  const { error } = await supabase
    .from("time_slots")
    .delete()
    .eq("id", slotId);

  if (error) {
    console.error("[TimeSlots] Error deleting time slot:", error);
    throw new Error(`Failed to delete time slot: ${error.message}`);
  }
}

// ============================================
// CONSULTATION BOOKINGS
// ============================================

/**
 * Create a new consultation booking
 */
export async function createConsultationBooking(
  booking: Omit<ConsultationBooking, "id" | "createdAt" | "updatedAt" | "bookingReference" | "bookedAt">
): Promise<ConsultationBooking> {
  const { data, error } = await supabase
    .from("consultation_bookings")
    .insert({
      time_slot_id: booking.timeSlotId,
      doctor_id: booking.doctorId,
      mother_id: booking.motherId,
      consultation_id: booking.consultationId,
      issue_description: booking.issueDescription,
      additional_notes: booking.additionalNotes,
      status: booking.status || "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("[Bookings] Error creating booking:", error);
    throw new Error(`Failed to create booking: ${error.message}`);
  }

  return dbToBooking(data);
}

/**
 * Get bookings for a doctor
 */
export async function getDoctorBookings(
  doctorId: string,
  options?: {
    status?: string;
    fromDate?: string;
  }
): Promise<ConsultationBooking[]> {
  let query = supabase
    .from("consultation_bookings")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("created_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Bookings] Error fetching doctor bookings:", error);
    throw new Error(`Failed to fetch bookings: ${error.message}`);
  }

  return (data || []).map(dbToBooking);
}

/**
 * Get bookings for a mother
 */
export async function getMotherBookings(motherId: string): Promise<ConsultationBooking[]> {
  const { data, error } = await supabase
    .from("consultation_bookings")
    .select("*")
    .eq("mother_id", motherId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Bookings] Error fetching mother bookings:", error);
    throw new Error(`Failed to fetch bookings: ${error.message}`);
  }

  return (data || []).map(dbToBooking);
}

/**
 * Get bookings for a specific time slot
 */
export async function getSlotBookings(slotId: string): Promise<ConsultationBooking[]> {
  const { data, error } = await supabase
    .from("consultation_bookings")
    .select("*")
    .eq("time_slot_id", slotId)
    .order("booked_at", { ascending: true });

  if (error) {
    console.error("[Bookings] Error fetching slot bookings:", error);
    throw new Error(`Failed to fetch slot bookings: ${error.message}`);
  }

  return (data || []).map(dbToBooking);
}

/**
 * Get a single booking by ID
 */
export async function getConsultationBooking(bookingId: string): Promise<ConsultationBooking | null> {
  const { data, error } = await supabase
    .from("consultation_bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.error("[Bookings] Error fetching booking:", error);
    throw new Error(`Failed to fetch booking: ${error.message}`);
  }

  return dbToBooking(data);
}

/**
 * Update a consultation booking
 */
export async function updateConsultationBooking(
  bookingId: string,
  updates: Partial<Omit<ConsultationBooking, "id" | "timeSlotId" | "doctorId" | "motherId" | "bookingReference" | "bookedAt" | "createdAt" | "updatedAt">>
): Promise<ConsultationBooking> {
  const dbUpdates: any = {};

  if (updates.status) {
    dbUpdates.status = updates.status;
    if (updates.status === "approved" || updates.status === "rejected") {
      dbUpdates.responded_at = new Date().toISOString();
    }
    if (updates.status === "completed") {
      dbUpdates.completed_at = new Date().toISOString();
    }
  }
  if (updates.issueDescription) dbUpdates.issue_description = updates.issueDescription;
  if (updates.additionalNotes !== undefined) dbUpdates.additional_notes = updates.additionalNotes;
  if (updates.consultationId) dbUpdates.consultation_id = updates.consultationId;
  if (updates.cancellationReason) dbUpdates.cancellation_reason = updates.cancellationReason;

  const { data, error } = await supabase
    .from("consultation_bookings")
    .update(dbUpdates)
    .eq("id", bookingId)
    .select()
    .single();

  if (error) {
    console.error("[Bookings] Error updating booking:", error);
    throw new Error(`Failed to update booking: ${error.message}`);
  }

  return dbToBooking(data);
}

/**
 * Find booking by reference number
 */
export async function findBookingByReference(reference: string): Promise<ConsultationBooking | null> {
  const { data, error } = await supabase
    .from("consultation_bookings")
    .select("*")
    .eq("booking_reference", reference)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.error("[Bookings] Error finding booking by reference:", error);
    throw new Error(`Failed to find booking: ${error.message}`);
  }

  return dbToBooking(data);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function dbToTimeSlot(row: any): TimeSlot {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: row.duration_minutes,
    maxBookings: row.max_bookings,
    currentBookings: row.current_bookings,
    status: row.status,
    slotType: row.slot_type,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dbToBooking(row: any): ConsultationBooking {
  return {
    id: row.id,
    timeSlotId: row.time_slot_id,
    doctorId: row.doctor_id,
    motherId: row.mother_id,
    consultationId: row.consultation_id,
    issueDescription: row.issue_description,
    additionalNotes: row.additional_notes,
    status: row.status,
    bookingReference: row.booking_reference,
    bookedAt: row.booked_at,
    respondedAt: row.responded_at,
    completedAt: row.completed_at,
    cancellationReason: row.cancellation_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
