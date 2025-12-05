import express from "express";
import { addReminder, createQuestion, getProfile, listQuestions, listReminders, listUploads, updateProfile } from "../controllers/motherController.js";
import { authRequired, requireRole } from "../middlewares/auth.js";

const router = express.Router();

router.use(authRequired, requireRole("mother"));
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.post("/questions", createQuestion);
router.get("/questions", listQuestions);
router.post("/reminders", addReminder);
router.get("/reminders", listReminders);
router.get("/uploads", listUploads);

export default router;

