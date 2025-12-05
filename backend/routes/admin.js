import express from "express";
import { approveDoctor, deleteQuestion, listDoctors, listMothers, listQuestions, rejectDoctor } from "../controllers/adminController.js";
import { authRequired, requireRole } from "../middlewares/auth.js";

const router = express.Router();

router.use(authRequired, requireRole("admin"));
router.get("/doctors", listDoctors);
router.get("/mothers", listMothers);
router.get("/questions", listQuestions);
router.post("/doctors/:id/approve", approveDoctor);
router.post("/doctors/:id/reject", rejectDoctor);
router.delete("/questions/:id", deleteQuestion);

export default router;

