import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
    createCheckoutSession,
  
    confirmPayment 
} from "../controllers/stripeController.js"; 

const router = express.Router();

router.post("/create-checkout-session", authMiddleware, createCheckoutSession);


router.post("/confirm-payment", authMiddleware, confirmPayment); 


export default router;