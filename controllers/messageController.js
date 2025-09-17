import Message from "../models/message.js";



export const createMessage = async (req, res) => {
    try {
        const { name, email, contactNumber, subject, message } = req.body;
        const newMessage = await Message.create({
            name,
            email,
            contactNumber,
            subject,
            message,
        });
        res.status(201).json({ message: "Message sent successfully", message: newMessage });
    } catch (err) {
        console.error("Error sending message:", err);
        res.status(500).json({ message: "Failed to send message", error: err.message });
    }
};


export const getMessages = async (req, res) => {
    try {
        const messages = await Message.find();
        res.status(200).json(messages);
    } catch (err) {
        console.error("Error fetching messages:", err);
        res.status(500).json({ message: "Failed to fetch messages", error: err.message });
    }
};  


export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const deletedMessage = await Message.findByIdAndDelete(messageId);
        if (!deletedMessage) {
            return res.status(404).json({ message: "Message not found" });
        }
        res.json({ message: "Message deleted successfully" });
    } catch (err) {
        console.error("Error deleting message:", err);
        res.status(500).json({ message: "Failed to delete message", error: err.message });
    }
}