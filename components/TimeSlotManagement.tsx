"use client";

import { useState, useEffect } from "react";
import Icon from "./Icon";

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  maxBookings: number;
  currentBookings: number;
  status: string;
  notes?: string;
}

interface Booking {
  id: string;
  bookingReference: string;
  issueDescription: string;
  additionalNotes?: string;
  status: string;
  bookedAt: string;
  mother?: {
    name: string;
    email: string;
    age?: number;
    phone?: string;
  };
  timeSlot?: {
    date: string;
    startTime: string;
    endTime: string;
  };
}

interface Props {
  token: string;
}

export default function TimeSlotManagement({ token }: Props) {
  const [activeView, setActiveView] = useState<"slots" | "bookings">("slots");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Time slot form state
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotForm, setSlotForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    durationMinutes: 30,
    maxBookings: 1,
    notes: "",
  });

  useEffect(() => {
    if (token) {
      loadTimeSlots();
      loadBookings();
    }
  }, [token]);

  const headers = () => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  });

  const loadTimeSlots = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/doctor/time-slots?fromDate=${today}`, {
        headers: headers(),
      });
      if (res.ok) {
        const data = await res.json();
        setTimeSlots(data.timeSlots || []);
      }
    } catch (error) {
      console.error("Failed to load time slots:", error);
    }
  };

  const loadBookings = async () => {
    try {
      const res = await fetch("/api/doctor/bookings", {
        headers: headers(),
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error("Failed to load bookings:", error);
    }
  };

  const createTimeSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/doctor/time-slots", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(slotForm),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Time slot created successfully!");
        setShowSlotForm(false);
        setSlotForm({
          date: "",
          startTime: "",
          endTime: "",
          durationMinutes: 30,
          maxBookings: 1,
          notes: "",
        });
        await loadTimeSlots();
      } else {
        setMessage(`❌ ${data.error || "Failed to create time slot"}`);
      }
    } catch (error) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const deleteTimeSlot = async (id: string) => {
    if (!confirm("Are you sure you want to delete this time slot?")) return;

    try {
      const res = await fetch(`/api/doctor/time-slots?id=${id}`, {
        method: "DELETE",
        headers: headers(),
      });

      if (res.ok) {
        setMessage("✅ Time slot deleted successfully!");
        await loadTimeSlots();
      } else {
        const data = await res.json();
        setMessage(`❌ ${data.error || "Failed to delete time slot"}`);
      }
    } catch (error) {
      setMessage("❌ Network error. Please try again.");
    }
  };

  const handleBookingResponse = async (
    bookingId: string,
    status: "approved" | "rejected",
    rejectionReason?: string
  ) => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/doctor/bookings", {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ bookingId, status, rejectionReason }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`✅ Booking ${status} successfully!`);
        await loadBookings();
        await loadTimeSlots(); // Reload to update booking counts
      } else {
        setMessage(`❌ ${data.error || "Failed to update booking"}`);
      }
    } catch (error) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
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

  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const upcomingSlots = timeSlots.filter(
    (s) => s.status === "available" && new Date(s.date) >= new Date()
  );

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">
          Consultation Management
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView("slots")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeView === "slots"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            Time Slots
          </button>
          <button
            onClick={() => setActiveView("bookings")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeView === "bookings"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <span className="flex items-center gap-2">
              Bookings
              {pendingBookings.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingBookings.length}
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

      {/* Time Slots View */}
      {activeView === "slots" && (
        <div className="space-y-4">
          {/* Create New Slot Button */}
          {!showSlotForm && (
            <button
              onClick={() => setShowSlotForm(true)}
              className="w-full sm:w-auto btn-primary flex items-center gap-2"
            >
              <Icon name="add" size={20} />
              Create New Time Slot
            </button>
          )}

          {/* Create Slot Form */}
          {showSlotForm && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Create Time Slot</h3>
              <form onSubmit={createTimeSlot} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={slotForm.date}
                      onChange={(e) =>
                        setSlotForm({ ...slotForm, date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Duration (minutes)
                    </label>
                    <select
                      value={slotForm.durationMinutes}
                      onChange={(e) =>
                        setSlotForm({
                          ...slotForm,
                          durationMinutes: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>1 hour</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={slotForm.startTime}
                      onChange={(e) =>
                        setSlotForm({ ...slotForm, startTime: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      End Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={slotForm.endTime}
                      onChange={(e) =>
                        setSlotForm({ ...slotForm, endTime: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={slotForm.notes}
                    onChange={(e) =>
                      setSlotForm({ ...slotForm, notes: e.target.value })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Morning consultation, Follow-up only"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? "Creating..." : "Create Slot"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSlotForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Time Slots List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">
              Upcoming Slots ({upcomingSlots.length})
            </h3>
            {upcomingSlots.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
                <Icon name="calendar" size={48} className="mx-auto text-slate-400 mb-2" />
                <p className="text-slate-600">No upcoming time slots</p>
                <p className="text-sm text-slate-500 mt-1">
                  Create your first slot to start accepting bookings
                </p>
              </div>
            ) : (
              upcomingSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-800">
                          {formatDate(slot.date)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            slot.status === "available"
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {slot.status}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600">
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}{" "}
                        ({slot.durationMinutes} min)
                      </div>
                      {slot.notes && (
                        <div className="text-sm text-slate-500 mt-1">
                          📝 {slot.notes}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 mt-1">
                        Bookings: {slot.currentBookings}/{slot.maxBookings}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTimeSlot(slot.id)}
                      className="text-red-600 hover:text-red-700 px-3 py-1 rounded hover:bg-red-50 transition-colors text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bookings View */}
      {activeView === "bookings" && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">
            Booking Requests ({pendingBookings.length} pending)
          </h3>

          {bookings.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
              <Icon name="people" size={48} className="mx-auto text-slate-400 mb-2" />
              <p className="text-slate-600">No booking requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className={`border rounded-lg p-4 ${
                    booking.status === "pending"
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">
                          {booking.mother?.name || "Patient"}
                        </div>
                        <div className="text-sm text-slate-600">
                          {booking.mother?.email}
                        </div>
                        {booking.mother?.phone && (
                          <div className="text-sm text-slate-600">
                            📞 {booking.mother.phone}
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
                      <div className="bg-white rounded-md p-2 border border-slate-200">
                        <div className="text-sm font-medium text-slate-700">
                          📅 {formatDate(booking.timeSlot.date)} •{" "}
                          {formatTime(booking.timeSlot.startTime)} -{" "}
                          {formatTime(booking.timeSlot.endTime)}
                        </div>
                      </div>
                    )}

                    {/* Issue Description */}
                    <div className="bg-white rounded-md p-3 border border-slate-200">
                      <div className="text-xs text-slate-500 font-medium mb-1">
                        ISSUE DESCRIPTION:
                      </div>
                      <div className="text-sm text-slate-700">
                        {booking.issueDescription}
                      </div>
                      {booking.additionalNotes && (
                        <>
                          <div className="text-xs text-slate-500 font-medium mt-2 mb-1">
                            ADDITIONAL NOTES:
                          </div>
                          <div className="text-sm text-slate-700">
                            {booking.additionalNotes}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Booking Reference */}
                    <div className="text-xs text-slate-500">
                      Booking Ref: #{booking.bookingReference}
                    </div>

                    {/* Action Buttons (only for pending) */}
                    {booking.status === "pending" && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() =>
                            handleBookingResponse(booking.id, "approved")
                          }
                          disabled={loading}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt(
                              "Reason for rejection (optional):"
                            );
                            if (reason !== null) {
                              handleBookingResponse(
                                booking.id,
                                "rejected",
                                reason
                              );
                            }
                          }}
                          disabled={loading}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
                        >
                          ✗ Reject
                        </button>
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
