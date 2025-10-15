import Stripe from "stripe";
import dotenv from "dotenv";
import Appointment from "../models/appointment.js";
import TempCart from "../models/tempCart.js"; // Import the model

import { addMinutesToTimeStr } from "../utils/timeUtils.js";

dotenv.config();





if (!process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY is missing in environment variables!");
    process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { 
    apiVersion: "2023-10-16" 
}); 

// ──────────────────────────────────────────────────────────────────────────────
// createCheckoutSession (Correct, uses TempCart to store data)
// ──────────────────────────────────────────────────────────────────────────────
export const createCheckoutSession = async (req, res) => {
    const { cartItems, paymentOption } = req.body;
    

    if (!req.user || !req.user._id)
        return res.status(401).json({ message: "Unauthorized" });

    if (!cartItems?.length)
        return res.status(400).json({ message: "No items in cart" });
    
    try {
        
        const tempCart = await TempCart.create({
            cartItems,
            paymentOption,
            userId: req.user._id,
        });

        const line_items = cartItems.map(item => {
        
            let usdAmount = Number(item.fullPayment); 

          
            if (isNaN(usdAmount) || usdAmount < 0.50) {
              
                throw new Error(`Minimum transaction amount of 0.50 USD not met. The price sent was $${usdAmount.toFixed(2)} USD.`);
            }
            
          
            const unit_amount = Math.round(usdAmount * 100); 

            return {
                price_data: { 
                    currency: "usd", 
                    product_data: {
                        name: item.serviceName || "Service",
                        description: `${item.stylistName || ""} | ${item.date || ""}`, 
                    },
                    unit_amount: unit_amount, 
                },
                quantity: 1,
            };
        });

        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"], 
            mode: "payment",                
            line_items,                     
            
          
            success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/dateAndTimeSelect`,
            
           
            metadata: {
                tempCartId: tempCart._id.toString(),
                paymentOption: paymentOption, 
                userId: req.user._id.toString(), 
            },
        });

        res.status(200).json({ id: session.id });
    } catch (err) {
       
        console.error("Stripe session creation error:", err);
        const message = err.message || err.raw?.message || "Failed to create Stripe session";
        
        const status = message.includes("Minimum transaction amount") || message.includes("success_url") ? 400 : 500;
        res.status(status).json({ message });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// confirmPayment (Updated to use TempCart ID)
// ──────────────────────────────────────────────────────────────────────────────
export async function confirmPayment(req, res) {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: "No session ID provided" });

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (session.payment_status === "paid") {
            // Success! Appointment creation is handled by the Webhook (stripeWebhookHandler).
            return res.status(200).json({
                message: "Payment successfully confirmed. Appointments are being created by the server.",
                status: "processing"
            });
        }
        // If payment is not 'paid' (e.g., 'unpaid', 'requires_payment_method')
        res.status(400).json({ message: "Payment not completed or failed." });
        
    } catch (err) {
        // Log the error but don't crash the server with a 500
        console.error("confirmPayment verification error:", err.message);
        res.status(500).json({ message: "Failed to verify payment status with Stripe." });
    }
}


// ──────────────────────────────────────────────────────────────────────────────
// stripeWebhookHandler (Updated to use TempCart ID)
// ──────────────────────────────────────────────────────────────────────────────
export const stripeWebhookHandler = async (req, res) => {
    let event;

    try {
        const sig = req.headers["stripe-signature"];
        // Ensure STRIPE_WEBHOOK_SECRET is set correctly on Render
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error("Webhook signature failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        if (session.payment_status === "paid") {
            try {
                const { tempCartId, paymentOption } = session.metadata;

                if (!tempCartId) {
                    console.error("Metadata missing tempCartId for session:", session.id);
                    return res.status(400).send("Metadata missing tempCartId");
                }
                
               
                const tempCart = await TempCart.findById(tempCartId);

                if (!tempCart || !tempCart.cartItems?.length) {
                    console.error("TempCart record not found or empty for ID:", tempCartId);
                  
                    return res.status(200).send("TempCart record already processed or expired.");
                }

                const cartItems = tempCart.cartItems;
                const isHalfPayment = paymentOption === "half";
                const createdAppointments = [];

              
                for (const item of cartItems) {
                   
                    const exists = await Appointment.findOne({
                        user: tempCart.userId, 
                        serviceName: item.serviceName,
                        date: new Date(item.date),
                        time: item.time
                    });

                    if (exists) continue; 

                   
                    const originalTotal = Number(item.price || 0);
                    const amountPaidNow = Number(item.fullPayment || 0); 
                    const finalDuePayment = originalTotal - amountPaidNow;

                    await Appointment.create({
                        stylistName: item.stylistName,
                        serviceName: item.serviceName,
                        subName: item.subName,
                        date: new Date(item.date),
                        time: item.time,
                        endTime: item.endTime || addMinutesToTimeStr(item.time, 60),
                        type: item.type,
                        paymentType: isHalfPayment ? "Half" : "Full", 
                        fullPayment: amountPaidNow, 
                        duePayment: finalDuePayment < 0 ? 0 : finalDuePayment, 
                        user: tempCart.userId, 
                        status: "Completed" 
                    });
                    createdAppointments.push(appt);
                }
                
                
                await TempCart.findByIdAndDelete(tempCartId);

                console.log(`${createdAppointments.length} Appointments saved successfully from webhook for session: ${session.id}`);

            } catch (err) {
                console.error("Failed to process and save appointments from webhook:", err);
                return res.status(500).send("Failed to process session completion."); 
            }
        }
    }

   
    res.status(200).send("Webhook received successfully.");
};