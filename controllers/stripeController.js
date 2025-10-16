import Stripe from "stripe";
import dotenv from "dotenv";
import Appointment from "../models/appointment.js";
import TempCart from "../models/tempCart.js"; 

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
// createCheckoutSession - (Currency/Pricing logic is checked here)
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
             
                throw new Error(`Minimum transaction amount of 0.50 USD not met. The price sent was $${usdAmount.toFixed(2)} USD. Please check your currency conversion.`);
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
// confirmPayment (Validated and robust)
// ──────────────────────────────────────────────────────────────────────────────
export async function confirmPayment(req, res) {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: "No session ID provided" });

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (!session) return res.status(400).json({ message: "Invalid session ID" });

        const { tempCartId, paymentOption } = session.metadata;
        if (!tempCartId) return res.status(400).json({ message: "Missing TempCart ID in session metadata." });

        const tempCart = await TempCart.findById(tempCartId);
        if (!tempCart || !tempCart.cartItems?.length) return res.status(404).json({ message: "TempCart data not found or already processed." });

        const cartItems = tempCart.cartItems;
        const isHalfPayment = paymentOption === "half";
        
        if (session.payment_status === "paid") {
            const createdAppointments = [];
            
            for (const item of cartItems) {
                
       
               if (!item.serviceName || !item.date || !item.time || !item.type || !item.stylistName || item.subName === undefined) {
        console.warn(`[CONFIRM_FAIL] Skipping item due to MISSING DATA. Service: ${item.serviceName}, Date: ${item.date}.`); 
        continue; 
    }
                
                const appointmentDate = new Date(item.date);
                if (isNaN(appointmentDate)) {
                    console.warn(`Skipping cart item due to invalid date format: ${item.date}`);
                    continue; 
                }

             
                const exists = await Appointment.findOne({
                    user: tempCart.userId,
                    serviceName: item.serviceName,
                    date: appointmentDate,
                    time: item.time
                });
                if (exists) continue;

                const originalTotal = Number(item.price || 0);
                const amountPaidNow = Number(item.fullPayment || 0); 
                const finalDuePayment = originalTotal - amountPaidNow;

                
                const appt = await Appointment.create({
                
                    stylistName: item.stylistName,
                    serviceName: item.serviceName,
                    subName: item.subName,
                    date: appointmentDate, 
                    time: item.time,
                    type: item.type, 
                    endTime: item.endTime || addMinutesToTimeStr(item.time, 60), 

                
                    user: tempCart.userId, 
                    paymentType: isHalfPayment ? "Half" : "Full", 
                    fullPayment: amountPaidNow, 
                    duePayment: finalDuePayment < 0 ? 0 : finalDuePayment, 
                    status: "Completed",
                });
                createdAppointments.push(appt);
            }
          
            await TempCart.findByIdAndDelete(tempCartId);

            return res.status(200).json({
                message: "Payment confirmed! Appointments created.",
                createdCount: createdAppointments.length
            });
        }
        res.status(400).json({ message: "Payment not completed" });
    } catch (err) {
        console.error("confirmPayment fatal error:", err); 
        res.status(500).json({ message: "Failed to confirm payment due to a server error." });
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// stripeWebhookHandler (FIXED and robust)
// ──────────────────────────────────────────────────────────────────────────────
export const stripeWebhookHandler = async (req, res) => {
    let event;

    try {
        const sig = req.headers["stripe-signature"];
     
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
                    
                 
                    if (!item.serviceName || !item.date || !item.time || !item.type || !item.stylistName || item.subName === undefined) {
                        console.warn(`Webhook: Skipping cart item due to missing required data: ${JSON.stringify(item)}`);
                        continue; 
                    }
                    
                    const appointmentDate = new Date(item.date);
                    if (isNaN(appointmentDate)) {
                        console.warn(`Webhook: Skipping cart item due to invalid date format: ${item.date}`);
                        continue; 
                    }
                    
                    const exists = await Appointment.findOne({
                        user: tempCart.userId, 
                        serviceName: item.serviceName,
                        date: appointmentDate, 
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
                        date: appointmentDate, 
                        time: item.time,
                        endTime: item.endTime || addMinutesToTimeStr(item.time, 60),
                        type: item.type, 
                        
                        paymentType: isHalfPayment ? "Half" : "Full", 
                        fullPayment: amountPaidNow, 
                        duePayment: finalDuePayment < 0 ? 0 : finalDuePayment, 
                        user: tempCart.userId, 
                        status: "Completed" 
                    });
                    createdAppointments.push(item); 
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