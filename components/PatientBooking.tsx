"use client";

import { useState, useEffect } from "react";
import Icon from "./Icon";

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
  notes?: string;
}

interface Booking {
  id: string;
  timeSlotId: string;
  bookingReference: string;
  issueDescription: string;
  additionalNotes?: string;
  status: string;
  bookedAt: string;
  doctor?: {
    name: string;
    specialty?: string;
    email: string;
  };
  timeSlot?: {
    date: string;
    startTime: string;
    endTime: string;
  };
}

interface Doctor {
  id: string;
  name: string;
  specialty?: string;
}

interface Props {
  token: string;
  connectedDoctors: Doctor[];  // List of doctors patient is connected with
}

export default function PatientBooking({ token, connectedDoctors }: Props) {
  const [activeView, setActiveView] = useState<"book" | "my-bookings">("book");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Booking form state
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [bookingForm, setBookingForm] = useState({
    issueDescription: "",
    additionalNotes: "",
  });

  useEffect(() => {
    if (token) {
      loadMyBookings();
      // Auto-select first doctor if available
      if (connectedDoctors.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(connectedDoctors[0].id);
      }
    }
  }, [token, connectedDoctors]);

  useEffect(() => {
    if (selectedDoctorId && activeView === "book") {
      loadTimeSlots();
    }
  }, [selectedDoctorId, activeView]);

  const headers = () => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  });

  const loadTimeSlots = async () => {
    if (!selectedDoctorId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/mother/bookings?doctorId=${selectedDoctorId}`, {
        headers: headers(),
      });
      if (res.ok) {
        const data = await res.json();
        setTimeSlots(data.timeSlots || []);
      }
    } catch (error) {
      console.error("Failed to load time slots:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyBookings = async () => {
    try {
      const res = await fetch("/api/mother/bookings", {
        headers: headers(),
      });
      if (res.ok) {
        const data = await res.json();
        setMyBookings(data.bookings || []);
      }
    } catch (error) {
      console.error("Failed to load bookings:", error);
    }
  };

  const createBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/mother/bookings", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          timeSlotId: selectedSlot.id,
          doctorId: selectedDoctorId,
          issueDescription: bookingForm.issueDescription,
          additionalNotes: bookingForm.additionalNotes,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Booking request sent! Waiting for doctor approval.");
        setShowBookingForm(false);
        setSelectedSlot(null);
        setBookingForm({ issueDescription: "", additionalNotes: "" });
        await loadMyBookings();
        await loadTimeSlots(); // Refresh available slots
      } else {
        setMessage(`❌ ${data.error || "Failed to create booking"}`);
      }
    } catch (error) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    const reason = prompt("Reason for cancellation (optional):");
    if (reason === null) return; // User clicked Cancel

    try {
      const res = await fetch("/api/mother/bookings", {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ bookingId, cancellationReason: reason }),
      });

      if (res.ok) {
        setMessage("✅ Booking cancelled successfully");
        await loadMyBookings();
        await loadTimeSlots();
      } else {
        const data = await res.json();
        setMessage(`❌ ${data.error || "Failed to cancel booking"}`);
      }
    } catch (error) {
      setMessage("❌ Network error. Please try again.");
    }
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5); // HH:MM from HH:MM:SS
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const selectedDoctor = connectedDoctors.find((d) => d.id === selectedDoctorId);
  const upcomingBookings = myBookings.filter((b) => 
    ["pending", "approved"].includes(b.status) &&
    b.timeSlot && new Date(b.timeSlot.date) >= new Date()
  );

  if (connectedDoctors.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
        <Icon name="doctor" size={48} className="mx-auto text-slate-400 mb-3" />
        <h3 className="font-semibold text-lg text-slate-700 mb-2">No Connected Doctors</h3>
        <p className="text-slate-600 mb-4">
          You need to connect with a doctor first to book consultations.
        </p>
        <p className="text-sm text-slate-500">
          Go to the Consultation tab to connect with a doctor using their reference number.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">
          Consultation Booking
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView("book")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeView === "book"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            Book Slot
          </button>
          <button
            onClick={() => setActiveView("my-bookings")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeView === "my-bookings"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <span className="flex items-center gap-2">
              My Bookings
              {upcomingBookings.length > 0 && (
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {upcomingBookings.length}
                </span>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.startsWith("✅")
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message}
        </div>
      )}

      {/* Book Consultation View */}
      {activeView === "book" && (
        <div className="space-y-4">
          {/* Doctor Selection */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Doctor
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {connectedDoctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}{doctor.specialty ? ` - ${doctor.specialty}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Booking Form (if slot selected) */}
          {showBookingForm && selectedSlot && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-900">
                Book Consultation
              </h3>
              <div className="bg-white rounded-lg p-3 mb-4 border border-blue-200">
                <div className="text-sm font-medium text-slate-700">
                  📅 {formatDate(selectedSlot.date)} • {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
                </div>
                <div className="text-sm text-slate-600">
                  With {selectedDoctor?.name}
                </div>
              </div>

              <form onSubmit={createBooking} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    What would you like to discuss? *
                  </label>
                  <textarea
                    required
                    minLength={10}
                    value={bookingForm.issueDescription}
                    onChange={(e) =>
                      setBookingForm({
                        ...bookingForm,
                        issueDescription: e.target.value,
                      })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Please describe your symptoms, concerns, or questions in detail (minimum 10 characters)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Additional Notes (optional)
                  </label>
                  <textarea
                    value={bookingForm.additionalNotes}
                    onChange={(e) =>
                      setBookingForm({
                        ...bookingForm,
                        additionalNotes: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Any other information you'd like the doctor to know"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex-1"
                  >
                    {loading ? "Sending Request..." : "Send Booking Request"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBookingForm(false);
                      setSelectedSlot(null);
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Available Time Slots */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">
              Available Time Slots
              {selectedDoctor && ` - ${selectedDoctor.name}`}
            </h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-600 mt-3">Loading time slots...</p>
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
                <Icon name="calendar" size={48} className="mx-auto text-slate-400 mb-2" />
                <p className="text-slate-600">No available time slots</p>
                <p className="text-sm text-slate-500 mt-1">
                  Please check back later or contact your doctor
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {timeSlots.map((slot) => {
                  // Check if this slot is already booked by the patient
                  const isAlreadyBooked = myBookings.some(
                    (booking) => 
                      booking.timeSlotId === slot.id && 
                      ["pending", "approved"].includes(booking.status)
                  );

                  return (
                    <div
                      key={slot.id}
                      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all hover:border-blue-300"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="font-semibold text-slate-800">
                          {formatDate(slot.date)}
                        </div>
                        <div className="text-slate-600">
                          🕐 {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </div>
                        {slot.notes && (
                          <div className="text-sm text-slate-500">
                            📝 {slot.notes}
                          </div>
                        )}
                        {isAlreadyBooked ? (
                          <button
                            disabled
                            className="bg-slate-300 text-slate-600 px-4 py-2 rounded-lg font-medium cursor-not-allowed mt-2"
                          >
                            Already Booked
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedSlot(slot);
                              setShowBookingForm(true);
                            }}
                            className="btn-primary mt-2"
                          >
                            Book This Slot
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* My Bookings View */}
      {activeView === "my-bookings" && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">
            My Booking Requests ({upcomingBookings.length} upcoming)
          </h3>

          {myBookings.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
              <Icon name="list" size={48} className="mx-auto text-slate-400 mb-2" />
              <p className="text-slate-600">No bookings yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Book your first consultation slot to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myBookings.map((booking) => (
                <div
                  key={booking.id}
                  className={`border rounded-lg p-4 ${
                    booking.status === "pending"
                      ? "bg-yellow-50 border-yellow-200"
                      : booking.status === "approved"
                      ? "bg-green-50 border-green-200"
                      : booking.status === "rejected"
                      ? "bg-red-50 border-red-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">
                          {booking.doctor?.name || "Doctor"}
                        </div>
                        {booking.doctor?.specialty && (
                          <div className="text-sm text-slate-600">
                            {booking.doctor.specialty}
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                          booking.status === "pending"
                            ? "bg-yellow-200 text-yellow-800"
                            : booking.status === "approved"
                            ? "bg-green-200 text-green-800"
                            : booking.status === "rejected"
                            ? "bg-red-200 text-red-800"
                            : "bg-slate-200 text-slate-800"
                        }`}
                      >
                        {booking.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Time Slot Info */}
                    {booking.timeSlot && (
                      <div className="bg-white rounded-md p-3 border border-slate-200">
                        <div className="text-sm font-medium text-slate-700">
                          📅 {formatDate(booking.timeSlot.date)} •{" "}
                          {formatTime(booking.timeSlot.startTime)} -{" "}
                          {formatTime(booking.timeSlot.endTime)}
                        </div>
                      </div>
                    )}

                    {/* Booking Reference */}
                    <div className="text-xs text-slate-500">
                      Booking Reference: #{booking.bookingReference}
                    </div>

                    {/* Issue Description */}
                    <div className="text-sm text-slate-700">
                      <span className="font-medium">Issue: </span>
                      {booking.issueDescription}
                    </div>

                    {/* Cancel Button - Only for pending bookings */}
                    {booking.status === "pending" && (
                      <button
                        onClick={() => cancelBooking(booking.id)}
                        className="text-red-600 hover:text-red-700 px-3 py-1 rounded hover:bg-red-50 transition-colors text-sm font-medium w-full sm:w-auto"
                      >
                        Cancel Booking
                      </button>
                    )}
                    {booking.status === "approved" && (
                      <div className="text-xs text-slate-500 italic">
                        Approved bookings can only be cancelled by the doctor
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
