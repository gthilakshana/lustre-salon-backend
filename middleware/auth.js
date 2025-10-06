// lustre-salon-backend/middleware/auth.js

import jwt from "jsonwebtoken";
import User from "../models/user.js";

export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided or invalid format" });
        }

       
        const token = authHeader.split(" ")[1].trim(); 
        
      
        if (!token || token.toLowerCase() === 'null' || token.toLowerCase() === 'undefined') {
            console.error("Auth error: Token value is null/undefined string.");
            return res.status(401).json({ message: "Invalid token value. Please log in again." });
        }
        
    
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

       
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "Invalid token: user not found" });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error("Auth error:", err.name + ":", err.message);
        res.status(401).json({ message: "Unauthorized: Invalid or expired token", error: err.message });
    }
};