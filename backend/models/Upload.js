import mongoose from "mongoose";

const uploadSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    url: { type: String, required: true },
    type: { type: String, enum: ["prescription", "report", "avatar"], default: "prescription" },
    originalName: String
  },
  { timestamps: true }
);

const Upload = mongoose.model("Upload", uploadSchema);
export default Upload;

