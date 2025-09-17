import express from "express";
import { createAppointment, getAppointments, deleteAppointment, saveAppointmentsAfterPayment } from "../controllers/appointmentController.js";

const appointmentRouter = express.Router();

appointmentRouter.post("/", createAppointment);
appointmentRouter.get("/", getAppointments);
appointmentRouter.delete("/:id", deleteAppointment);
appointmentRouter.post("/cart", saveAppointmentsAfterPayment);

export default appointmentRouter;
