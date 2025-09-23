import express from "express";
import {
    createAppointment,
    getAppointments,
    deleteAppointment,
    saveAppointmentsAfterPayment,
    saveAppointmentsBookOnly,
    getMyAppointments,
    updateAppointmentStatus,
    confirmPayment // <-- new
} from "../controllers/appointmentController.js";
import { authMiddleware } from "../middleware/auth.js";

const appointmentRouter = express.Router();

appointmentRouter.post("/", authMiddleware, createAppointment);
appointmentRouter.get("/", authMiddleware, getAppointments);
appointmentRouter.delete("/:id", authMiddleware, deleteAppointment);
appointmentRouter.get("/my", authMiddleware, getMyAppointments);
appointmentRouter.post("/cart", authMiddleware, saveAppointmentsAfterPayment);
appointmentRouter.post("/book-only", authMiddleware, saveAppointmentsBookOnly);
appointmentRouter.patch("/:id/status", authMiddleware, updateAppointmentStatus);

// --- New route for confirming Stripe payment ---
appointmentRouter.post("/confirm-payment", authMiddleware, confirmPayment);

export default appointmentRouter;
