import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";
import cron from "node-cron";

// Routes
import stripeRouter from "./routes/stripeRouter.js";
import userRouter from "./routes/userRouter.js";
import serviceRouter from "./routes/serviceRouter.js";
import messageRouter from "./routes/messageRouter.js";
import appointmentRouter from "./routes/appointmentRouter.js";
import { stripeWebhookHandler } from './controllers/stripeController.js'; 
import invoiceRouter from "./routes/invoiceRouter.js";

// Models
import Appointment from "./models/appointment.js";
import Message from "./models/message.js";


import { combineDateAndTime, addMinutesToTimeStr } from "./utils/timeUtils.js";

dotenv.config();
const app = express();

// ----------------------------------------------------------------------
// STRIPE WEBHOOK ROUTE (MUST come before express.json())
// ----------------------------------------------------------------------

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler); 


// ----------------------------------------------------------------------
// GENERAL MIDDLEWARE
// ----------------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// JWT Authentication Middleware
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

// ----------------------------------------------------------------------
// DATABASE CONNECTION
// ----------------------------------------------------------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Database connected successfully"))
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });

// ----------------------------------------------------------------------
// API ROUTES
// ----------------------------------------------------------------------
app.get("/", (req, res) => res.send("Lustre Salon API is running"));

app.use("/api/users", userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/services", serviceRouter);

// Stripe routes (excluding webhook, already defined above)
app.use("/api/stripe", stripeRouter);


app.use("/api/invoices", invoiceRouter);


app.use(express.static("public"));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});


// ----------------------------------------------------------------------
//  CRON JOBS
// ----------------------------------------------------------------------
cron.schedule("0 0 * * *", async () => {
  try {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const result = await Message.deleteMany({ createdAt: { $lt: fiveDaysAgo } });
    console.log(`[CRON] Deleted ${result.deletedCount} old messages.`);
  } catch (err) {
    console.error("[CRON] Message cleanup error:", err);
  }
});

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

      if (endDateTime <= now) {
        a.status = "Completed";
        await a.save();
        console.log(`[CRON] Appointment ${a._id} marked as Completed.`);
      }
    }
  } catch (err) {
    console.error("[CRON] Status update error:", err);
  }
});

// ----------------------------------------------------------------------
// 6START SERVER
// ----------------------------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
