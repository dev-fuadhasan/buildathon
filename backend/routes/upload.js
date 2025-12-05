import express from "express";
import multer from "multer";
import { uploadToR2 } from "../utils/r2.js";
import Upload from "../models/Upload.js";
import { authRequired } from "../middlewares/auth.js";

const upload = multer();
const router = express.Router();

router.post("/prescription", authRequired, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const fileName = `prescriptions/${Date.now()}-${file.originalname}`;
    const result = await uploadToR2(file, fileName);
    const uploadDoc = await Upload.create({
      user: req.user._id,
      url: result.Location,
      type: "prescription",
      originalName: file.originalname
    });
    res.json({ url: result.Location, upload: uploadDoc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

