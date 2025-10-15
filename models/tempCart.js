// models/tempCart.js
import mongoose from "mongoose";

const TempCartSchema = new mongoose.Schema({
    cartItems: { 
        type: Array, 
        required: true 
    },
    paymentOption: { 
        type: String, 
        required: true 
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true 
    },
}, { 
    timestamps: true 
});

// CRITICAL: Auto-delete the temporary record after 1 hour (3600 seconds)
TempCartSchema.index({ "createdAt": 1 }, { expireAfterSeconds: 3600 });

// ✅ FIX: Check if the model exists before compiling it to prevent OverwriteModelError
const TempCart = mongoose.models.TempCart || mongoose.model("TempCart", TempCartSchema);

export default TempCart;