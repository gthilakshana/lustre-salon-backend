import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    contactNumber: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    isRead: {
        type: Boolean,
        default: false  
    }
}, { timestamps: true });

// --- TTL Index: auto-delete messages after 5 days --- //
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 5 * 24 * 60 * 60 }); // 5 days

const Message = mongoose.model("Message", messageSchema);

export default Message;

