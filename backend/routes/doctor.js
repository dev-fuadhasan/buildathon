import express from "express";
import { answerQuestion, getMotherProfile, getStatus, listPatientQuestions, updateAvailability } from "../controllers/doctorController.js";
import { authRequired, requireRole } from "../middlewares/auth.js";

const router = express.Router();

router.use(authRequired, requireRole("doctor"));
router.get("/status", getStatus);
router.get("/questions", listPatientQuestions);
router.post("/answers", answerQuestion);
router.put("/availability", updateAvailability);
router.get("/mother/:id", getMotherProfile);

export default router;

