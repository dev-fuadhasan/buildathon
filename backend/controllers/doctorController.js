import Doctor from "../models/Doctor.js";
import Question from "../models/Question.js";
import Answer from "../models/Answer.js";
import User from "../models/User.js";

export async function getStatus(req, res) {
  const doctor = await Doctor.findOne({ user: req.user._id });
  res.json({ doctor });
}

export async function listPatientQuestions(_req, res) {
  const questions = await Question.find({ status: "open" }).populate("mother");
  res.json({ questions });
}

export async function answerQuestion(req, res) {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor || doctor.status !== "approved") {
      return res.status(403).json({ error: "Doctor not approved" });
    }
    const question = await Question.findById(req.body.questionId);
    if (!question) return res.status(404).json({ error: "Question not found" });
    const answer = await Answer.create({
      question: question._id,
      doctor: doctor._id,
      content: req.body.content
    });
    question.answers.push(answer._id);
    question.status = "answered";
    question.doctor = doctor._id;
    await question.save();
    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateAvailability(req, res) {
  try {
    const doctor = await Doctor.findOneAndUpdate(
      { user: req.user._id },
      { availability: req.body.availability || [] },
      { new: true }
    );
    res.json({ doctor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMotherProfile(req, res) {
  const mother = await User.findById(req.params.id).select("-password");
  res.json({ mother });
}

