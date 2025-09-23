// models/tempCart.js
import mongoose from "mongoose";
const TempCartSchema = new mongoose.Schema({
  cartItems: Array,
  paymentOption: String,
  userId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });
export default mongoose.model("TempCart", TempCartSchema);
