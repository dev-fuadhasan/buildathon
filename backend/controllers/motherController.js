import User from "../models/User.js";
import Question from "../models/Question.js";
import Reminder from "../models/Reminder.js";
import Upload from "../models/Upload.js";

export async function getProfile(req, res) {
  res.json({ user: req.user });
}

export async function updateProfile(req, res) {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createQuestion(req, res) {
  try {
    const question = await Question.create({ mother: req.user._id, content: req.body.content });
    res.json({ question });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listQuestions(req, res) {
  const questions = await Question.find({ mother: req.user._id }).populate("answers");
  res.json({ questions });
}

export async function addReminder(req, res) {
  try {
    const reminder = await Reminder.create({ user: req.user._id, ...req.body });
    res.json({ reminder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listReminders(req, res) {
  const reminders = await Reminder.find({ user: req.user._id }).sort({ scheduleDate: 1 });
  res.json({ reminders });
}

export async function listUploads(req, res) {
  const uploads = await Upload.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ uploads });
}

