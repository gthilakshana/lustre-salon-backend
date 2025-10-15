import express from "express";
import {
    createAppointment,
    getAppointments,
    deleteAppointment,
    // saveAppointmentsAfterPayment,
    saveAppointmentsBookOnly,
    getMyAppointments,
    updateAppointmentStatus,
  
    getAppointmentsByDate,
    getAppointmentsByStylistAndDate,
    generateInvoice 
} from "../controllers/appointmentController.js";
import { authMiddleware } from "../middleware/auth.js";

const appointmentRouter = express.Router();


appointmentRouter.post("/", authMiddleware, createAppointment);
appointmentRouter.get("/", authMiddleware, getAppointments); 
appointmentRouter.delete("/:id", authMiddleware, deleteAppointment);
appointmentRouter.get("/my", authMiddleware, getMyAppointments);
// appointmentRouter.post("/cart", authMiddleware, saveAppointmentsAfterPayment);
appointmentRouter.post("/book-only", authMiddleware, saveAppointmentsBookOnly);
appointmentRouter.patch("/:id/status", authMiddleware, updateAppointmentStatus);

appointmentRouter.get("/by-date", authMiddleware, getAppointmentsByDate);

appointmentRouter.get("/by-stylist-date", getAppointmentsByStylistAndDate);



appointmentRouter.post("/generate-invoice", authMiddleware, generateInvoice);

export default appointmentRouter;
