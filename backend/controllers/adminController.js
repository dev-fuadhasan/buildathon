import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import Question from "../models/Question.js";

export async function approveDoctor(req, res) {
  const doctor = await Doctor.findByIdAndUpdate(req.params.id, { status: "approved" }, { new: true });
  res.json({ doctor });
}

export async function rejectDoctor(req, res) {
  const doctor = await Doctor.findByIdAndUpdate(req.params.id, { status: "rejected" }, { new: true });
  res.json({ doctor });
}

export async function listDoctors(_req, res) {
  const doctors = await Doctor.find().populate("user");
  res.json({ doctors });
}

export async function listMothers(_req, res) {
  const mothers = await User.find({ role: "mother" }).select("-password");
  res.json({ mothers });
}

export async function listQuestions(_req, res) {
  const questions = await Question.find().populate("mother doctor answers");
  res.json({ questions });
}

export async function deleteQuestion(req, res) {
  await Question.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}

