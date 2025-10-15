import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
    createCheckoutSession,
      
} from "../controllers/stripeController.js";

const router = express.Router();


router.post("/create-checkout-session", authMiddleware, createCheckoutSession);




export default router;
