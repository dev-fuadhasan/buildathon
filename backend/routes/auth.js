import express from "express";
import { login, registerDoctor, registerMother } from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.post("/register/mother", registerMother);
router.post("/register/doctor", registerDoctor);

export default router;

