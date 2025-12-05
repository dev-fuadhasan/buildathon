import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    mother: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    content: { type: String, required: true },
    status: { type: String, enum: ["open", "answered"], default: "open" },
    answers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Answer" }]
  },
  { timestamps: true }
);

const Question = mongoose.model("Question", questionSchema);
export default Question;

