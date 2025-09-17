import express from "express";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-08-16" });
const stripeRouter = express.Router(); 

// Create checkout session
stripeRouter.post("/create-checkout-session", async (req, res) => {
    const { cartItems } = req.body;

    try {
        const lineItems = cartItems.map(item => ({
            price_data: {
                currency: "lkr",
                product_data: { name: item.title },
                unit_amount: parseInt(item.price.replace(/,/g, '').replace(' LKR', '')) * 100,
            },
            quantity: 1,
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            success_url: `${process.env.FRONTEND_URL}/success`,
            cancel_url: `${process.env.FRONTEND_URL}/cart`,
        });

        res.json({ id: session.id });
    } catch (err) {
        console.error("Stripe error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

export default stripeRouter;
