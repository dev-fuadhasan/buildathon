import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["mother", "doctor", "admin"], default: "mother" },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    age: Number,
    trimester: String,
    lastCheckup: Date,
    weight: Number,
    height: Number,
    medicalIssues: [String],
    avatarUrl: String,
    reminders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reminder" }]
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;

