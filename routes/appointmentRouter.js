import express from "express";
import {
    createAppointment,
    getAppointments,
    deleteAppointment,
    saveAppointmentsAfterPayment,
    saveAppointmentsBookOnly,
    getMyAppointments
} from "../controllers/appointmentController.js";
import { authMiddleware } from "../middleware/auth.js";

const appointmentRouter = express.Router();

appointmentRouter.post("/", authMiddleware, createAppointment);
appointmentRouter.get("/", authMiddleware, getAppointments);
appointmentRouter.delete("/:id", authMiddleware, deleteAppointment);
appointmentRouter.get("/my", authMiddleware, getMyAppointments); 
appointmentRouter.post("/cart", authMiddleware, saveAppointmentsAfterPayment);
appointmentRouter.post("/book-only", authMiddleware, saveAppointmentsBookOnly);

export default appointmentRouter;
