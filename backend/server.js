import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import authRoutes from "./routes/auth.js";
import motherRoutes from "./routes/mother.js";
import doctorRoutes from "./routes/doctor.js";
import adminRoutes from "./routes/admin.js";
import chatbotRoutes from "./routes/chatbot.js";
import uploadRoutes from "./routes/upload.js";

dotenv.config();

const app = express();
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const __dirname = path.resolve();

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Routes
app.use("/auth", authRoutes);
app.use("/mother", motherRoutes);
app.use("/doctor", doctorRoutes);
app.use("/admin", adminRoutes);
app.use("/chatbot", chatbotRoutes);
app.use("/upload", uploadRoutes);

// Serve frontend (for local testing)
app.use(express.static(path.join(__dirname, "frontend")));

app.use((err, _req, res, _next) => {
  // Basic error handler
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server Error" });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/momscare";

async function start() {
  try {
    await mongoose.connect(MONGO_URI, { autoIndex: true });
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

start();

