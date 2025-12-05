import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "devsecret", {
    expiresIn: "7d"
  });
}

export async function registerMother(req, res) {
  try {
    const existing = await User.findOne({ email: req.body.email });
    if (existing) return res.status(400).json({ error: "Email already registered" });
    const user = await User.create({ ...req.body, role: "mother" });
    res.json({ token: signToken(user), user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function registerDoctor(req, res) {
  try {
    const existing = await User.findOne({ email: req.body.email });
    if (existing) return res.status(400).json({ error: "Email already registered" });
    const user = await User.create({ name: req.body.name, email: req.body.email, password: req.body.password, role: "doctor" });
    await Doctor.create({
      user: user._id,
      bmdCertificate: req.body.bmdCertificate,
      specialization: req.body.specialization,
      experience: req.body.experience,
      hospital: req.body.hospital,
      nidOrLicenseUrl: req.body.nidOrLicenseUrl
    });
    res.json({ token: signToken(user), user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function login(req, res) {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ error: "User not found" });
    const valid = await user.comparePassword(req.body.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });
    res.json({ token: signToken(user), user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

