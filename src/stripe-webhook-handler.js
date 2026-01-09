/**
 * Stripe Webhook Handler for KAA Client Portal
 * Handles checkout.session.completed events to create users, clients, projects, and payments
 */

const bcrypt = require('bcrypt');
const { sendPortalAccessEmail } = require('./email-service');

/**
 * Generate a random access code for client portal
 * @returns {string} 8-character uppercase alphanumeric code
 */
function generateAccessCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Generate a temporary password for new user
 * @returns {string} 12-character random password
 */
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Handle checkout.session.completed Stripe webhook event
 * Creates user, client, project, and payment records
 *
 * @param {object} event - Stripe event object
 * @param {object} prisma - Prisma client instance
 * @returns {Promise<object>} Created records
 */
async function handleCheckoutSessionCompleted(event, prisma) {
  const session = event.data.object;

  // Extract data from Stripe session
  const customerEmail = session.customer_details?.email || session.customer_email;
  const customerId = session.customer;
  const paymentIntentId = session.payment_intent;
  const amountTotal = session.amount_total; // Amount in cents
  const currency = session.currency || 'usd';

  // Extract metadata
  const metadata = session.metadata || {};
  const tier = parseInt(metadata.tier, 10) || 1;
  const projectAddress = metadata.project_address || metadata.projectAddress || 'Unknown Address';
  const projectName = metadata.project_name || metadata.projectName || `${projectAddress} Project`;

  if (!customerEmail) {
    throw new Error('Customer email is required');
  }

  if (!paymentIntentId) {
    throw new Error('Payment intent ID is required');
  }

  // Generate credentials
  const accessCode = generateAccessCode();
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  // Use Prisma transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // 1. Check if user already exists
    let user = await tx.user.findUnique({
      where: { email: customerEmail }
    });

    // 2. Create user if not exists
    if (!user) {
      user = await tx.user.create({
        data: {
          email: customerEmail,
          passwordHash,
          userType: 'SAGE_CLIENT',
          tier
        }
      });
    }

    // 3. Check if client exists for this user
    let client = await tx.client.findUnique({
      where: { userId: user.id }
    });

    // 4. Create client if not exists
    if (!client) {
      client = await tx.client.create({
        data: {
          userId: user.id,
          tier,
          status: 'ONBOARDING',
          projectAddress
        }
      });
    }

    // 5. Create project
    const project = await tx.project.create({
      data: {
        clientId: client.id,
        tier,
        status: 'ONBOARDING',
        name: projectName,
        paymentStatus: 'paid'
      }
    });

    // 6. Create payment record
    const payment = await tx.payment.create({
      data: {
        projectId: project.id,
        stripePaymentIntentId: paymentIntentId,
        stripeCustomerId: customerId || 'unknown',
        amount: amountTotal,
        currency,
        status: 'SUCCEEDED',
        tier
      }
    });

    // 7. Create audit log entry
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'payment',
        resourceType: 'payment',
        resourceId: payment.id,
        details: {
          stripeSessionId: session.id,
          tier,
          amount: amountTotal,
          currency
        }
      }
    });

    return { user, client, project, payment, accessCode };
  });

  // 8. Send portal access email (outside transaction)
  await sendPortalAccessEmail(customerEmail, {
    accessCode,
    projectAddress,
    tier,
    projectName
  });

  return result;
}

/**
 * Verify Stripe webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - Stripe signature header
 * @param {object} stripe - Stripe instance
 * @returns {object} Verified event
 */
function verifyWebhookSignature(payload, signature, stripe) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Express route handler for Stripe webhooks
 * @param {object} stripe - Stripe instance
 * @param {object} prisma - Prisma client instance
 * @returns {function} Express middleware
 */
function createWebhookHandler(stripe, prisma) {
  return async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event;
    try {
      event = verifyWebhookSignature(req.body, signature, stripe);
    } catch (error) {
      console.error('Webhook signature verification failed:', error.message);
      return res.status(400).json({ error: `Webhook Error: ${error.message}` });
    }

    // Handle specific event types
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const result = await handleCheckoutSessionCompleted(event, prisma);
          console.log('Checkout session completed:', {
            userId: result.user.id,
            projectId: result.project.id,
            paymentId: result.payment.id
          });
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook handler error:', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  };
}

module.exports = {
  handleCheckoutSessionCompleted,
  verifyWebhookSignature,
  createWebhookHandler,
  generateAccessCode,
  generateTempPassword
};
