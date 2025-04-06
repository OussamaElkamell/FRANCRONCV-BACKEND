const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const auth = require('../middleware/auth');
const UserModel = require('../models/User');

const router = express.Router();

// Define the product IDs for each plan
const PRODUCT_IDS = {
  basic: 'prod_S3zgSNsoc2gdbw', // Your basic product ID
  pro: 'prod_S3zg0vtAQQpt0Q'    // Your pro product ID
};

// POST /api/payment/checkout
router.post('/checkout', auth, async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;
    
    if (!['basic', 'pro'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan'
      });
    }
    
    // Get user info from the request
    const email = req.user.email;
    
    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: email,
      metadata: {
        userId: userId
      }
    });
    
    const stripeCustomerId = customer.id;
    
    // Get the appropriate product ID for the plan
    const productId = PRODUCT_IDS[plan];
    
    if (!productId) {
      return res.status(404).json({
        success: false,
        message: `Product ID not found for plan: ${plan}`
      });
    }
    
    // Create a price for the product (one-time payment)
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: plan === 'basic' ? 1999 : 4999, // $19.99 for basic, $49.99 for pro
      currency: 'usd',
    });
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [
        {
          price: price.id,
          quantity: 1
        }
      ],
      mode: 'payment', // For one-time payment
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
      metadata: {
        userId: userId,
        plan: plan
      }
    });
    
    res.json({
      success: true,
      data: {
        url: session.url
      }
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session'
    });
  }
});

// POST /api/payment/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log(`Checkout session completed for user ${session.metadata.userId}`);
      // Handle successful payment - update user subscription status
      break;
    }
    
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      console.log(`Payment succeeded for customer ${paymentIntent.customer}`);
      // Additional payment success handling if needed
      break;
    }
  }
  
  res.status(200).json({ received: true });
});

// GET /api/payment/verify
router.get('/verify', auth, async (req, res) => {
  try {
    const { session_id } = req.query;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }
    
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Check if payment was successful
    if (session.payment_status === 'paid') {
      // Update user subscription status (if you have a database)
      // This is where you'd update the user's subscription in your database
      
      return res.json({
        success: true,
        data: {
          paid: true,
          plan: session.metadata.plan
        }
      });
    }
    
    return res.json({
      success: true,
      data: {
        paid: false
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
});

// POST /api/payment/unsubscribe
router.post('/unsubscribe', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Update user subscription status to 'free'
    await UserModel.update(userId, { subscription: 'free' });
    
    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
});

module.exports = router;
