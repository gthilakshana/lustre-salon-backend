import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
    stylistName: {
        type: String,
        required: true,
        trim: true
    },
    services: [
        {
            type: String,   
            required: true
        }
    ],
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["Gents", "Ladies"],
        required: true
    },
    fullPayment: {
        type: Number,
        required: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",  
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
        default: "Pending"
    }
}, { timestamps: true });

const Appointment = mongoose.model("Appointment", appointmentSchema);

export default Appointment;
