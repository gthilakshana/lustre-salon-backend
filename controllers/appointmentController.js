import Appointment from "../models/appointment.js";
import Stripe from "stripe";
import dotenv from "dotenv";
import { combineDateAndTime, addMinutesToTimeStr } from "../utils/timeUtils.js";

dotenv.config();

// Ensure Stripe key exists
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY is missing in environment variables!");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-08-16" });

// ──────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────────────────────────────────────
export async function ensureEndTimeAndSave(appt) {
  if (!appt.endTime || appt.endTime.trim() === "") {
    const computed = addMinutesToTimeStr(appt.time || "9:00 AM", 60);
    appt.endTime = computed;
    await appt.save();
  }
}

export async function updateStatusesIfNeeded(appointments) {
  const now = new Date();
  const updates = [];
  for (const a of appointments) {
    await ensureEndTimeAndSave(a);
    const endDateTime = combineDateAndTime(a.date, a.endTime);
    if (a.status !== "Completed" && endDateTime <= now) {
      a.status = "Completed";
      updates.push(a.save());
    }
  }
  if (updates.length) await Promise.all(updates);
}

// ──────────────────────────────────────────────────────────────────────────────
// CRUD Controllers
// ──────────────────────────────────────────────────────────────────────────────
export async function createAppointment(req, res) {
  try {
    const { stylistName, serviceName, subName, date, time, endTime, type,
            fullPayment, duePayment, paymentType } = req.body;

    if (!req.user || !req.user._id)
      return res.status(401).json({ message: "Unauthorized" });

    const appointment = await Appointment.create({
      stylistName,
      serviceName,
      subName,
      date,
      time,
      endTime: endTime || undefined,
      type,
      paymentType,
      fullPayment,
      duePayment,
      user: req.user._id,
      status: "Pending",
    });

    await ensureEndTimeAndSave(appointment);
    res.status(201).json({ message: "Appointment created successfully", appointment });
  } catch (err) {
    console.error("Error creating appointment:", err);
    res.status(500).json({ message: err.message || "Failed to create appointment" });
  }
}

export async function getAppointments(req, res) {
  try {
    const appointments = await Appointment.find().populate("user", "fullName email");
    res.status(200).json(appointments);
  } catch (err) {
    console.error("Get appointments error:", err);
    res.status(500).json({ message: err.message || "Failed to fetch appointments" });
  }
}

export async function getMyAppointments(req, res) {
  try {
    let appointments = await Appointment.find({ user: req.user._id });
    await updateStatusesIfNeeded(appointments);
    appointments = await Appointment.find({ user: req.user._id });
    res.status(200).json(appointments);
  } catch (err) {
    console.error("Error fetching my appointments:", err);
    res.status(500).json({ message: err.message || "Failed to fetch appointments" });
  }
}

export async function deleteAppointment(req, res) {
  try {
    const { id } = req.params;
    const deleted = await Appointment.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Appointment not found" });
    res.json({ message: "Appointment deleted successfully" });
  } catch (err) {
    console.error("Error deleting appointment:", err);
    res.status(500).json({ message: err.message || "Failed to delete appointment" });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Booking & Payment Controllers
// ──────────────────────────────────────────────────────────────────────────────
export async function saveAppointmentsBookOnly(req, res) {
  try {
    const { appointments } = req.body;
    if (!req.user || !req.user._id) return res.status(401).json({ message: "Unauthorized" });
    if (!appointments?.length) return res.status(400).json({ message: "No appointments provided" });

    const savedAppointments = [];
    for (const item of appointments) {
      const appt = await Appointment.create({
        stylistName: item.stylistName,
        serviceName: item.serviceName,
        subName: item.subName,
        date: new Date(item.date),
        time: item.time,
        endTime: item.endTime || undefined,
        type: item.type || item.gender,
        paymentType: "Book Only",
        fullPayment: 0,
        duePayment: Number(item.price || 0),
        user: req.user._id,
        status: "Pending"
      });
      await ensureEndTimeAndSave(appt);
      savedAppointments.push(appt);
    }
    res.status(201).json({ message: "Appointments booked successfully", savedAppointments });
  } catch (err) {
    console.error("Error booking appointments:", err);
    res.status(500).json({ message: err.message || "Failed to book appointments" });
  }
}

export async function saveAppointmentsAfterPayment(req, res) {
  try {
    const { cartItems, paymentOption } = req.body;
    if (!req.user || !req.user._id) return res.status(401).json({ message: "Unauthorized" });

    const savedAppointments = [];
    for (const item of cartItems) {
      const exists = await Appointment.findOne({
        user: req.user._id,
        serviceName: item.serviceName,
        date: item.date,
        time: item.time
      });
      if (exists) continue;

      let fullPayment = Number(item.fullPayment || 0);
      let duePayment = 0;
      if (paymentOption === "half") {
        duePayment = fullPayment / 2;
        fullPayment = fullPayment / 2;
      }

      const appt = await Appointment.create({
        stylistName: item.stylistName,
        serviceName: item.serviceName,
        subName: item.subName,
        date: new Date(item.date),
        time: item.time,
        endTime: item.endTime || undefined,
        type: item.type,
        paymentType: paymentOption === "half" ? "Half" : "Full",
        fullPayment,
        duePayment,
        user: req.user._id,
        status: "Pending"
      });

      await ensureEndTimeAndSave(appt);
      savedAppointments.push(appt);
    }
    res.status(201).json({ message: "Appointments saved successfully", savedAppointments });
  } catch (err) {
    console.error("Error saving appointments after payment:", err);
    res.status(500).json({ message: err.message || "Failed to save appointments" });
  }
}

export async function updateAppointmentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["Pending", "Completed"].includes(status))
      return res.status(400).json({ message: "Invalid status value" });

    const updated = await Appointment.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) return res.status(404).json({ message: "Appointment not found" });

    res.status(200).json({ message: `Appointment marked as ${status}`, appointment: updated });
  } catch (err) {
    console.error("Error updating appointment status:", err);
    res.status(500).json({ message: err.message || "Failed to update status" });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Stripe Payment
// ──────────────────────────────────────────────────────────────────────────────
export async function confirmPayment(req, res) {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ message: "No session ID provided" });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) return res.status(400).json({ message: "Invalid session ID" });

    let cartItems = [];
    try {
      if (session.metadata?.cartItems) {
        cartItems = JSON.parse(session.metadata.cartItems);
      }
    } catch (e) {
      console.error("Metadata parse error:", e);
    }

    if (session.payment_status === "paid") {
      const createdAppointments = [];
      for (const item of cartItems) {
        const exists = await Appointment.findOne({
          user: item.userId,
          serviceName: item.serviceName,
          date: item.date,
          time: item.time
        });
        if (exists) continue;

        const appt = await Appointment.create({
          stylistName: item.stylistName,
          serviceName: item.serviceName,
          subName: item.subName,
          date: new Date(item.date),
          time: item.time,
          endTime: item.endTime || addMinutesToTimeStr(item.time, 60),
          type: item.type,
          paymentType: item.paymentType,
          fullPayment: item.fullPayment,
          duePayment: item.duePayment,
          user: item.userId,
          status: "Completed"
        });
        createdAppointments.push(appt);
      }
      return res.status(200).json({
        message: "Payment confirmed! Appointments created.",
        createdCount: createdAppointments.length
      });
    }
    res.status(400).json({ message: "Payment not completed" });
  } catch (err) {
    console.error("confirmPayment error:", err);
    res.status(500).json({ message: "Failed to confirm payment" });
  }
}

export const createCheckoutSession = async (req, res) => {
  const { cartItems, paymentOption } = req.body;
  if (!cartItems?.length) return res.status(400).json({ message: "No items in cart" });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      // Stripe does NOT support LKR directly. Use a supported currency.
      line_items: cartItems.map(item => ({
        price_data: {
          currency: "usd", // <-- Change to a supported currency
          product_data: { name: item.serviceName },
          unit_amount: Math.round(item.fullPayment * 100)
        },
        quantity: 1
      })),
      metadata: {
        cartItems: JSON.stringify(cartItems),
        paymentOption
      },
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/dateAndTimeSelect`
    });
    res.status(200).json({ id: session.id });
  } catch (err) {
    console.error("Stripe session creation error:", err);
    res.status(500).json({ message: "Failed to create Stripe session" });
  }
};
