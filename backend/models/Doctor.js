import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bmdCertificate: { type: String, required: true },
    specialization: String,
    experience: Number,
    hospital: String,
    nidOrLicenseUrl: String,
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    availability: {
      type: [{ day: String, from: String, to: String }],
      default: []
    }
  },
  { timestamps: true }
);

const Doctor = mongoose.model("Doctor", doctorSchema);
export default Doctor;

