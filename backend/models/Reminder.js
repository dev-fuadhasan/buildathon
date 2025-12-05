import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["doctor_visit", "supplement", "growth_update"], required: true },
    message: { type: String, required: true },
    scheduleDate: { type: Date, required: true },
    sent: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Reminder = mongoose.model("Reminder", reminderSchema);
export default Reminder;

