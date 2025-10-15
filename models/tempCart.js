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


TempCartSchema.index({ "createdAt": 1 }, { expireAfterSeconds: 3600 });


const TempCart = mongoose.models.TempCart || mongoose.model("TempCart", TempCartSchema);

export default TempCart;