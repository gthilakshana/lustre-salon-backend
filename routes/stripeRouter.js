// routes/stripeRouter.js
import express from "express";
import Stripe from "stripe";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import Appointment from "../models/appointment.js";
import { authMiddleware } from "../middleware/auth.js";

dotenv.config();
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-08-16" });

// Create Checkout Session - protected
router.post("/create-checkout-session", authMiddleware, async (req, res) => {
  try {
    const { cartItems, paymentOption } = req.body;
    if (!cartItems?.length) return res.status(400).json({ message: "No items provided" });

    // Save appointments as Pending and collect their IDs
    const savedIds = [];
    for (const item of cartItems) {
      let fullPayment = Number(item.fullPayment ?? item.price ?? 0);
      let duePayment = 0;
      if (paymentOption === "half") {
        duePayment = fullPayment / 2;
        fullPayment = fullPayment / 2;
      } else if (paymentOption === "book-only") {
        duePayment = fullPayment;
        fullPayment = 0;
      }

      const appt = await Appointment.create({
        stylistName: item.stylistName || item.stylist || "Unnamed Stylist",
        serviceName: item.serviceName || item.title || "Service",
        subName: item.subName || item.subtitle || "",
        date: new Date(item.date),
        time: item.time,
        endTime: item.endTime || undefined,
        type: item.type || item.gender || "Gents",
        paymentType: paymentOption === "book-only" ? "Book Only" : paymentOption === "half" ? "Half" : "Full",
        fullPayment,
        duePayment,
        user: req.user._id,
        status: "Pending",
      });

      savedIds.push(appt._id.toString());
    }

    // Build line_items for Stripe (payable amounts)
    const line_items = cartItems.map(item => {
      const payable = Number(item.fullPayment ?? item.price ?? 0);
      const amount = Math.round(payable * 100);
      return {
        price_data: {
          currency: "lkr",
          product_data: { name: item.subName || item.serviceName || "Service" },
          unit_amount: amount,
        },
        quantity: 1,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/dateAndTimeSelect`,
      metadata: { appointmentIds: JSON.stringify(savedIds), paymentOption }
    });

    res.json({ id: session.id });
  } catch (err) {
    console.error("Stripe session error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Webhook
router.post("/webhook", bodyParser.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log("Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const appointmentIds = JSON.parse(session.metadata?.appointmentIds || "[]");
    try {
      if (appointmentIds.length) {
        await Appointment.updateMany({ _id: { $in: appointmentIds } }, { status: "Completed" });
        console.log(`Marked ${appointmentIds.length} appointment(s) completed via webhook.`);
      }
    } catch (e) {
      console.error("Failed to update appointments in webhook:", e);
    }
  }

  res.json({ received: true });
});

export default router;
