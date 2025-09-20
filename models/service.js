import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
    // Main category
    serviceName: {
        type: String,
        enum: [
            "Haircuts & Styling",
            "Hair Color Services",
            "Ladies hair chemical services",
            "Hair extension services"
        ],
        required: [true, "Service name is required"],   
        trim: true
    },

    // Sub-service inside the category
    subName: {
        type: String,
        required: [true, "Sub service name is required"], 
        trim: true
    },

    price: {
        type: Number,
        required: [true, "Price is required"],
        min: [0, "Price cannot be negative"]
    },

    description: {
        type: String,
        required: [true, "Description is required"],
        trim: true
    },

    status: {
        type: String,
        enum: ["Active", "Inactive", "Pending"],
        default: "Active"
    }
}, { timestamps: true });

export default mongoose.model("Service", serviceSchema);
