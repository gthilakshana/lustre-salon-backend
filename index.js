import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";
import cron from "node-cron";

import stripeRouter from "./routes/stripeRouter.js";
import userRouter from "./routes/userRouter.js";
import serviceRouter from "./routes/serviceRouter.js";  
import messageRouter from "./routes/messageRouter.js";
import appointmentRouter from "./routes/appointmentRouter.js";

import Appointment from "./models/appointment.js";
import Message from "./models/message.js";
import { combineDateAndTime, addMinutesToTimeStr } from "./utils/timeUtils.js";

dotenv.config();

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// JWT middleware to attach user info from token
app.use((req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      console.warn("Invalid token:", err.message);
    }
  }
  next();
});

// --- Connect to MongoDB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Database connected successfully"))
  .catch(err => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });


// --- Auto-delete messages older than 5 days ---
cron.schedule("0 0 * * *", async () => {
  try {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const result = await Message.deleteMany({ createdAt: { $lt: fiveDaysAgo } });
    console.log(`Auto-deleted ${result.deletedCount} messages older than 5 days`);
  } catch (err) {
    console.error("Error auto-deleting old messages:", err);
  }
});

// --- Routes ---
app.get("/", (req, res) => res.send("API is running"));

app.use("/api/users", userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/services", serviceRouter);
app.use("/api/stripe", stripeRouter);

// --- Cron job: mark appointments Completed after end time ---
cron.schedule("*/5 * * * *", async () => {
  try {
    const now = new Date();
    const pendings = await Appointment.find({ status: "Pending" });

    for (const a of pendings) {
      const startTime = a.time || "9:00 AM";
      if (!a.endTime || a.endTime.trim() === "") {
        a.endTime = addMinutesToTimeStr(startTime, 60);
        await a.save();
      }

      const endDateTime = combineDateAndTime(a.date, a.endTime);
      console.log(`Appointment ${a._id} ends at ${endDateTime}, now=${now}`);

      if (endDateTime <= now) {
        a.status = "Completed";
        await a.save();
        console.log(`Appointment ${a._id} marked as Completed`);
      }
    }
  } catch (err) {
    console.error("Cron job error:", err);
  }
});



// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
