// models/PendingPayment.js
import mongoose from "mongoose";

const PendingPaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  cartItems: { type: Array, required: true },
  paymentOption: { type: String, enum: ["full", "half"], required: true },
  createdAt: { type: Date, default: Date.now, expires: "1h" } // auto delete after 1 hour
});

export default mongoose.model("PendingPayment", PendingPaymentSchema);
