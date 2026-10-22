
require("dotenv").config();

const express = require("express");
const Stripe = require("stripe");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!SECRET_KEY || !SECRET_KEY.startsWith("sk_test_")) {
  console.error(
    "ERROR: Add a valid Stripe TEST secret key to your .env file."
  );
  process.exit(1);
}

const stripe = new Stripe(SECRET_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Day 24 Stripe Payments API is running",
    mode: "test"
  });
});

// Create a hosted Stripe Checkout Session
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Web Development Course",
              description: "Day 24 Stripe payment demo"
            },
            unit_amount: 1999
          },
          quantity: 1
        }
      ],
      success_url:
        `http://localhost:${PORT}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:${PORT}/cancel.html`
    });

    if (!session.url) {
      return res.status(500).json({
        success: false,
        message: "Stripe did not return a Checkout URL."
      });
    }

    res.json({
      success: true,
      url: session.url
    });
  } catch (error) {
    console.error("Stripe checkout error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to start checkout. Check server terminal."
    });
  }
});

// Retrieve and verify the Checkout Session on the server
app.get("/api/checkout-session", async (req, res) => {
  try {
    const sessionId = req.query.session_id;

    if (
      typeof sessionId !== "string" ||
      !sessionId.startsWith("cs_test_")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid test Checkout Session ID."
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (
      session.status !== "complete" ||
      session.payment_status !== "paid"
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment is not confirmed yet."
      });
    }

    res.json({
      success: true,
      message: "Payment verified successfully!",
      product: "Web Development Course",
      amount: session.amount_total / 100,
      currency: session.currency.toUpperCase()
    });
  } catch (error) {
    console.error("Payment verification error:", error.message);

    res.status(400).json({
      success: false,
      message: "Unable to verify payment."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Stripe Payments App: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log("Stripe mode: TEST");
});
