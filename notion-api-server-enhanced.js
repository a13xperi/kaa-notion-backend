const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const multer = require('multer');
const { Client } = require('@notionhq/client');
const { OpenAI } = require('openai');
const { PrismaClient } = require('@prisma/client');
const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize Stripe client
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());

// ============================================
// STRIPE WEBHOOK (must be before express.json())
// Stripe requires raw body for signature verification
// ============================================

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    console.error('❌ Stripe not configured');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`📩 Received Stripe event: ${event.type} (${event.id})`);

  try {
    // Idempotency check - skip if already processed
    const existingEvent = await prisma.processedStripeEvent.findUnique({
      where: { id: event.id }
    });

    if (existingEvent) {
      console.log(`⏭️  Event ${event.id} already processed, skipping`);
      return res.json({ received: true, skipped: true });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object, event.id);
        break;

      case 'payment_intent.succeeded':
        console.log(`💰 Payment intent succeeded: ${event.data.object.id}`);
        break;

      case 'payment_intent.payment_failed':
        console.log(`❌ Payment failed: ${event.data.object.id}`);
        break;

      default:
        console.log(`ℹ️  Unhandled event type: ${event.type}`);
    }

    // Mark event as processed (idempotency)
    await prisma.processedStripeEvent.create({
      data: {
        id: event.id,
        eventType: event.type,
        payload: event.data.object
      }
    });

    res.json({ received: true });
  } catch (err) {
    console.error(`❌ Error processing webhook: ${err.message}`);
    // Return 500 so Stripe will retry
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// JSON body parser for all other routes
app.use(express.json());

// File upload configuration - use memory storage for Vercel
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
}) : null;

// Email configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Configuration - Notion Database IDs (set these in .env or use auto-discovery)
const CLIENTS_DB = process.env.CLIENTS_DB_ID || process.env.CLIENT_CREDENTIALS_DB_ID;
const CLIENT_DOCUMENTS_DB = process.env.CLIENT_DOCUMENTS_DB_ID;
const CLIENT_ACTIVITIES_DB = process.env.CLIENT_ACTIVITIES_DB_ID || process.env.ACTIVITY_LOG_DB_ID;

// Legacy support
const CLIENT_CREDENTIALS_DB = CLIENTS_DB;
const ACTIVITY_LOG_DB = CLIENT_ACTIVITIES_DB;

// ============================================
// HELPER FUNCTIONS
// ============================================

function getPageTitle(page) {
  const titleProp = Object.values(page.properties).find(prop => prop.type === 'title');
  if (titleProp && titleProp.title && titleProp.title.length > 0) {
    return titleProp.title[0]?.plain_text || 'Untitled';
  }
  return 'Untitled';
}

function getPageEmoji(page) {
  return page.icon?.emoji || '📄';
}

async function findOrCreateDatabase(name, properties) {
  // Search for existing database
  const searchResults = await notion.search({
    query: name,
    filter: { property: 'object', value: 'database' }
  });

  const existing = searchResults.results.find(db => {
    const dbTitle = db.title?.[0]?.plain_text;
    return dbTitle && dbTitle.toLowerCase() === name.toLowerCase();
  });

  if (existing) {
    console.log(`✅ Found existing database: ${name}`);
    return existing.id;
  }

  // Create new database
  console.log(`📝 Creating new database: ${name}`);
  const newDb = await notion.databases.create({
    parent: { type: 'page_id', page_id: process.env.NOTION_PARENT_PAGE_ID || 'workspace' },
    title: [{ type: 'text', text: { content: name } }],
    properties: properties
  });

  return newDb.id;
}

async function logActivity(address, action, details = {}) {
  try {
    if (!ACTIVITY_LOG_DB) return;

    await notion.pages.create({
      parent: { database_id: ACTIVITY_LOG_DB },
      properties: {
        'Client Address': {
          title: [{ text: { content: address } }]
        },
        'Action': {
          rich_text: [{ text: { content: action } }]
        },
        'Details': {
          rich_text: [{ text: { content: JSON.stringify(details) } }]
        },
        'Timestamp': {
          date: { start: new Date().toISOString() }
        }
      }
    });
  } catch (error) {
    console.error('Error logging activity:', error.message);
  }
}

async function sendEmail(to, subject, html) {
  try {
    if (!process.env.EMAIL_USER) {
      console.log('📧 Email not configured - would send:', { to, subject });
      return;
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    });

    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error.message);
  }
}

// ============================================
// STRIPE CHECKOUT SESSION HANDLER
// ============================================

async function handleCheckoutSessionCompleted(session, eventId) {
  console.log(`🛒 Processing checkout session: ${session.id}`);

  // Extract customer info from the session
  const customerEmail = session.customer_email || session.customer_details?.email;
  const customerName = session.customer_details?.name || '';
  const stripeCustomerId = session.customer || '';
  const paymentIntentId = session.payment_intent || session.id;
  const amountTotal = session.amount_total || 0;
  const currency = session.currency || 'usd';

  if (!customerEmail) {
    console.error('❌ No customer email found in checkout session');
    throw new Error('Customer email is required');
  }

  console.log(`👤 Customer: ${customerEmail} (${customerName})`);

  // Determine tier from metadata or line items
  let tier = 1; // Default tier
  let projectAddress = '';

  // Check session metadata first
  if (session.metadata?.tier) {
    tier = parseInt(session.metadata.tier, 10);
  }
  if (session.metadata?.project_address) {
    projectAddress = session.metadata.project_address;
  }

  // If no tier in metadata, try to determine from line items
  if (!session.metadata?.tier && session.line_items) {
    // Fetch line items if available
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      for (const item of lineItems.data) {
        const priceId = item.price?.id;
        if (priceId) {
          // Look up tier by Stripe price ID
          const tierRecord = await prisma.tier.findFirst({
            where: { stripePriceId: priceId }
          });
          if (tierRecord) {
            tier = tierRecord.id;
            console.log(`📦 Matched tier ${tier} from price ${priceId}`);
            break;
          }
        }
      }
    } catch (err) {
      console.log(`⚠️  Could not fetch line items: ${err.message}`);
    }
  }

  console.log(`📊 Tier: ${tier}, Amount: ${amountTotal / 100} ${currency.toUpperCase()}`);

  // Use a transaction to ensure atomic operations
  const result = await prisma.$transaction(async (tx) => {
    // 1. Find or create User by email
    let user = await tx.user.findUnique({
      where: { email: customerEmail }
    });

    // Generate a random password and access code for new users
    const accessCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const tempPassword = Math.random().toString(36).substring(2, 14);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    if (!user) {
      console.log(`📝 Creating new user for ${customerEmail}`);
      user = await tx.user.create({
        data: {
          email: customerEmail,
          address: projectAddress || null,
          passwordHash: passwordHash,
          userType: 'SAGE_CLIENT',
          tier: tier
        }
      });
    } else {
      console.log(`👤 Found existing user: ${user.id}`);
      // Update tier if higher
      if (tier > (user.tier || 0)) {
        await tx.user.update({
          where: { id: user.id },
          data: { tier: tier }
        });
      }
    }

    // 2. Find or create Client
    let client = await tx.client.findUnique({
      where: { userId: user.id }
    });

    if (!client) {
      console.log(`📝 Creating new client for user ${user.id}`);
      client = await tx.client.create({
        data: {
          userId: user.id,
          tier: tier,
          status: 'ONBOARDING',
          projectAddress: projectAddress || `Project-${Date.now()}`
        }
      });
    } else {
      console.log(`🏢 Found existing client: ${client.id}`);
      // Update tier if higher
      if (tier > client.tier) {
        await tx.client.update({
          where: { id: client.id },
          data: { tier: tier }
        });
      }
    }

    // 3. Create Project
    const projectName = session.metadata?.project_name ||
                       customerName ? `${customerName}'s Project` :
                       `Project ${new Date().toLocaleDateString()}`;

    console.log(`📁 Creating project: ${projectName}`);
    const project = await tx.project.create({
      data: {
        clientId: client.id,
        tier: tier,
        status: 'ONBOARDING',
        name: projectName,
        paymentStatus: 'paid'
      }
    });

    // 4. Create Payment record
    console.log(`💳 Recording payment: ${paymentIntentId}`);
    const payment = await tx.payment.create({
      data: {
        projectId: project.id,
        stripePaymentIntentId: paymentIntentId,
        stripeCustomerId: stripeCustomerId || `cus_${session.id}`,
        amount: amountTotal,
        currency: currency,
        status: 'SUCCEEDED',
        tier: tier
      }
    });

    // 5. Create default milestones based on tier
    const milestones = getMilestonesForTier(tier);
    for (let i = 0; i < milestones.length; i++) {
      await tx.milestone.create({
        data: {
          projectId: project.id,
          tier: tier,
          name: milestones[i],
          order: i + 1,
          status: i === 0 ? 'IN_PROGRESS' : 'PENDING'
        }
      });
    }

    // 6. Create audit log entry
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'checkout_completed',
        resourceType: 'project',
        resourceId: project.id,
        details: {
          stripeEventId: eventId,
          sessionId: session.id,
          tier: tier,
          amount: amountTotal,
          currency: currency
        }
      }
    });

    return { user, client, project, payment, accessCode, tempPassword };
  });

  console.log(`✅ Checkout processing complete for ${customerEmail}`);
  console.log(`   User: ${result.user.id}`);
  console.log(`   Client: ${result.client.id}`);
  console.log(`   Project: ${result.project.id}`);
  console.log(`   Payment: ${result.payment.id}`);

  // 7. Send portal access email
  await sendPortalAccessEmail({
    email: customerEmail,
    name: customerName,
    projectAddress: result.client.projectAddress,
    accessCode: result.accessCode,
    tier: tier,
    projectName: result.project.name
  });

  return result;
}

// Helper function to get milestones based on tier
function getMilestonesForTier(tier) {
  const baseMilestones = ['Intake', 'Concept Development'];

  switch (tier) {
    case 1: // The Concept
      return [...baseMilestones, 'Design Delivery'];
    case 2: // The Builder
      return [...baseMilestones, 'Draft Review', 'Revisions', 'Final Design'];
    case 3: // The Concierge
      return [...baseMilestones, 'Site Visit', 'Draft Review', 'Revisions', 'Final Design', 'Installation Support'];
    case 4: // KAA White Glove
      return [...baseMilestones, 'Site Assessment', 'Design Development', 'Client Review', 'Revisions', 'Final Design', 'Installation Oversight', 'Project Completion'];
    default:
      return baseMilestones;
  }
}

// Send portal access email to new client
async function sendPortalAccessEmail({ email, name, projectAddress, accessCode, tier, projectName }) {
  const tierNames = {
    1: 'The Concept',
    2: 'The Builder',
    3: 'The Concierge',
    4: 'KAA White Glove'
  };

  const tierName = tierNames[tier] || `Tier ${tier}`;
  const portalUrl = process.env.FRONTEND_URL || 'https://kaa-app.vercel.app';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2d5a27 0%, #4a7c45 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 28px; }
        .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0 0; }
        .content { background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; }
        .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ddd; }
        .credentials h3 { margin-top: 0; color: #2d5a27; }
        .credential-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .credential-item:last-child { border-bottom: none; }
        .credential-label { font-weight: 600; color: #666; }
        .credential-value { font-family: monospace; font-size: 16px; color: #2d5a27; background: #f0f7ef; padding: 4px 8px; border-radius: 4px; }
        .cta-button { display: inline-block; background: #2d5a27; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .cta-button:hover { background: #3d7a37; }
        .tier-badge { display: inline-block; background: #2d5a27; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        .steps { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .steps ol { margin: 0; padding-left: 20px; }
        .steps li { margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌿 Welcome to SAGE</h1>
          <p>Your landscape design journey begins now</p>
        </div>

        <div class="content">
          <p>Hi ${name || 'there'},</p>

          <p>Thank you for choosing SAGE! Your payment has been processed and your client portal is ready.</p>

          <div style="text-align: center;">
            <span class="tier-badge">${tierName}</span>
          </div>

          <div class="credentials">
            <h3>🔐 Your Portal Access</h3>
            <div class="credential-item">
              <span class="credential-label">Project Address:</span>
              <span class="credential-value">${projectAddress}</span>
            </div>
            <div class="credential-item">
              <span class="credential-label">Access Code:</span>
              <span class="credential-value">${accessCode}</span>
            </div>
            <div class="credential-item">
              <span class="credential-label">Project:</span>
              <span class="credential-value">${projectName}</span>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${portalUrl}" class="cta-button">Access Your Portal</a>
          </div>

          <div class="steps">
            <h3>🚀 Getting Started</h3>
            <ol>
              <li>Click the button above or visit <strong>${portalUrl}</strong></li>
              <li>Enter your project address and access code</li>
              <li>Complete your project intake form</li>
              <li>Upload any inspiration photos or site documents</li>
            </ol>
          </div>

          <p>Your project manager will be in touch shortly to guide you through the next steps. In the meantime, feel free to explore your portal and start gathering your design ideas!</p>

          <p>Questions? Simply reply to this email or use the messaging feature in your portal.</p>

          <p>Welcome aboard! 🌱</p>
          <p><em>The SAGE Team</em></p>
        </div>

        <div class="footer">
          <p>© ${new Date().getFullYear()} SAGE Garden Wizard. All rights reserved.</p>
          <p>This email was sent to ${email}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(
    email,
    `🌿 Welcome to SAGE - Your ${tierName} Portal is Ready!`,
    html
  );

  // Also notify team
  if (process.env.TEAM_EMAIL) {
    await sendEmail(
      process.env.TEAM_EMAIL,
      `New Client: ${name || email} - ${tierName}`,
      `
        <h2>New Client Registration</h2>
        <p><strong>Name:</strong> ${name || 'Not provided'}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Tier:</strong> ${tierName}</p>
        <p><strong>Project:</strong> ${projectName}</p>
        <p><strong>Project Address:</strong> ${projectAddress}</p>
        <p><a href="${portalUrl}">View in Admin Portal</a></p>
      `
    );
  }

  console.log(`📧 Portal access email sent to ${email}`);
}

// ============================================
// DATABASE SETUP
// ============================================

async function initializeDatabases() {
  try {
    // Client Credentials Database
    if (!CLIENT_CREDENTIALS_DB) {
      const credentialsDb = await findOrCreateDatabase('Client Credentials', {
        'Address': { title: {} },
        'Email': { email: {} },
        'Password Hash': { rich_text: {} },
        'Access Code': { rich_text: {} },
        'Active': { checkbox: {} },
        'Expiry Date': { date: {} },
        'Last Login': { date: {} },
        'Created Date': { created_time: {} }
      });
      process.env.CLIENT_CREDENTIALS_DB_ID = credentialsDb;
    }

    // Activity Log Database
    if (!ACTIVITY_LOG_DB) {
      const activityDb = await findOrCreateDatabase('Client Activity Log', {
        'Client Address': { title: {} },
        'Action': { rich_text: {} },
        'Details': { rich_text: {} },
        'Timestamp': { date: {} }
      });
      process.env.ACTIVITY_LOG_DB_ID = activityDb;
    }

    console.log('✅ Databases initialized');
  } catch (error) {
    console.error('❌ Error initializing databases:', error.message);
  }
}

// ============================================
// API ROUTES - CLIENT AUTHENTICATION
// ============================================

// Create new client (Admin only)
app.post('/api/admin/clients/create', async (req, res) => {
  try {
    const { address, email, password } = req.body;

    if (!address || !email || !password) {
      return res.status(400).json({ 
        error: 'Address, email, and password are required' 
      });
    }

    // Generate access code and hash password
    const accessCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const passwordHash = await bcrypt.hash(password, 10);

    // Create client in Notion
    const client = await notion.pages.create({
      parent: { database_id: CLIENT_CREDENTIALS_DB },
      properties: {
        'Address': {
          title: [{ text: { content: address } }]
        },
        'Email': {
          email: email
        },
        'Password Hash': {
          rich_text: [{ text: { content: passwordHash } }]
        },
        'Access Code': {
          rich_text: [{ text: { content: accessCode } }]
        },
        'Active': {
          checkbox: true
        }
      }
    });

    // Send welcome email
    await sendEmail(
      email,
      'Your KAA Client Portal Access',
      `
        <h2>Welcome to KAA Client Portal</h2>
        <p>Your account has been created successfully!</p>
        <p><strong>Project Address:</strong> ${address}</p>
        <p><strong>Access Code:</strong> ${accessCode}</p>
        <p><strong>Login URL:</strong> <a href="${process.env.FRONTEND_URL || 'https://kaa-app.vercel.app'}">${process.env.FRONTEND_URL || 'https://kaa-app.vercel.app'}</a></p>
        <p>Click "Client Portal" and enter your address and access code to view your documents.</p>
        <p>If you need assistance, please contact support@kaa.com</p>
      `
    );

    // Log activity
    await logActivity(address, 'Client Created', { email, clientId: client.id });

    res.json({ 
      success: true, 
      client: {
        id: client.id,
        address,
        email,
        accessCode
      }
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Client verification
app.post('/api/client/verify', async (req, res) => {
  try {
    const { address, password } = req.body;

    if (!address || !password) {
      return res.status(400).json({ 
        verified: false, 
        error: 'Address and password are required' 
      });
    }

    // Demo mode
    if (password === 'demo123') {
      await logActivity(address, 'Login (Demo Mode)', { ip: req.ip });
      return res.json({ 
        verified: true, 
        address: address,
        mode: 'demo'
      });
    }

    // Production mode - check credentials database
    if (CLIENT_CREDENTIALS_DB) {
      try {
        const response = await notion.databases.query({
          database_id: CLIENT_CREDENTIALS_DB,
          filter: {
            property: 'Address',
            title: {
              equals: address
            }
          }
        });

        if (response.results.length > 0) {
          const clientPage = response.results[0];
          const props = clientPage.properties;

          // Check if active
          const isActive = props['Active']?.checkbox;
          if (!isActive) {
            return res.json({ 
              verified: false, 
              error: 'Account is inactive. Please contact support.' 
            });
          }

          // Check expiry date
          const expiryDate = props['Expiry Date']?.date?.start;
          if (expiryDate && new Date(expiryDate) < new Date()) {
            return res.json({ 
              verified: false, 
              error: 'Access has expired. Please contact support.' 
            });
          }

          // Verify password
          const passwordHash = props['Password Hash']?.rich_text?.[0]?.plain_text;
          const accessCode = props['Access Code']?.rich_text?.[0]?.plain_text;

          if (passwordHash && await bcrypt.compare(password, passwordHash)) {
            // Update last login
            await notion.pages.update({
              page_id: clientPage.id,
              properties: {
                'Last Login': {
                  date: { start: new Date().toISOString() }
                }
              }
            });

            await logActivity(address, 'Login Success', { ip: req.ip });

            // Send login notification to team
            if (process.env.TEAM_EMAIL) {
              await sendEmail(
                process.env.TEAM_EMAIL,
                `Client Login: ${address}`,
                `<p>Client <strong>${address}</strong> logged in at ${new Date().toLocaleString()}</p>`
              );
            }

            return res.json({ 
              verified: true, 
              address: address,
              email: props['Email']?.email
            });
          } else if (accessCode && accessCode === password) {
            // Allow login with access code
            await notion.pages.update({
              page_id: clientPage.id,
              properties: {
                'Last Login': {
                  date: { start: new Date().toISOString() }
                }
              }
            });

            await logActivity(address, 'Login Success (Access Code)', { ip: req.ip });

            return res.json({ 
              verified: true, 
              address: address,
              email: props['Email']?.email
            });
          }
        }
      } catch (notionError) {
        console.error('Error querying credentials:', notionError);
      }
    }

    // Fallback: search for pages with address
    const searchResponse = await notion.search({
      query: address,
      filter: { property: 'object', value: 'page' }
    });

    if (searchResponse.results.length > 0) {
      await logActivity(address, 'Login (Fallback)', { pageCount: searchResponse.results.length });
      return res.json({ 
        verified: true, 
        address: address,
        mode: 'fallback',
        pageCount: searchResponse.results.length
      });
    }

    // Invalid credentials
    await logActivity(address, 'Login Failed', { ip: req.ip });
    return res.json({ 
      verified: false, 
      error: 'Invalid address or password' 
    });

  } catch (error) {
    console.error('Error verifying client:', error);
    res.status(500).json({ 
      verified: false,
      error: 'Server error during verification' 
    });
  }
});

// User verification endpoint (second step - verify last name)
app.post('/api/client/verify-user', async (req, res) => {
  try {
    const { address, lastName } = req.body;

    if (!address || !lastName) {
      return res.status(400).json({
        verified: false,
        error: 'Address and last name are required'
      });
    }

    // Demo mode - accept any last name for demo accounts
    if (lastName.toLowerCase() === 'demo' || lastName.toLowerCase() === 'test') {
      return res.json({
        verified: true,
        address: address,
        lastName: lastName,
        mode: 'demo'
      });
    }

    // Check clients database for matching last name
    if (CLIENTS_DB) {
      try {
        const response = await notion.databases.query({
          database_id: CLIENTS_DB,
          filter: {
            or: [
              {
                property: 'Project Address',
                rich_text: {
                  equals: address
                }
              },
              {
                property: 'Client Name',
                title: {
                  contains: address
                }
              }
            ]
          }
        });

        if (response.results.length > 0) {
          const clientPage = response.results[0];
          const props = clientPage.properties;

          // Check if last name property exists and matches
          const storedLastName = props['Last Name']?.rich_text?.[0]?.plain_text ||
                                 props['LastName']?.rich_text?.[0]?.plain_text ||
                                 props['Surname']?.rich_text?.[0]?.plain_text;

          if (storedLastName && storedLastName.toLowerCase() === lastName.toLowerCase()) {
            await logActivity(address, 'User Verification Success', {
              lastName,
              ip: req.ip
            });

            return res.json({
              verified: true,
              address: address,
              lastName: lastName,
              clientId: clientPage.id
            });
          } else {
            await logActivity(address, 'User Verification Failed', {
              attemptedLastName: lastName,
              ip: req.ip
            });

            return res.json({
              verified: false,
              error: 'Last name does not match our records'
            });
          }
        }
      } catch (notionError) {
        console.error('Error querying clients database for user verification:', notionError);
      }
    }

    return res.json({
      verified: false,
      error: 'Could not verify user. Please contact support.'
    });

  } catch (error) {
    console.error('Error verifying user:', error);
    res.status(500).json({
      verified: false,
      error: 'Server error during verification'
    });
  }
});

// Get client-specific data
app.get('/api/client/data/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: 'Client address is required' });
    }

    // Get client information
    let clientInfo = null;
    if (CLIENTS_DB) {
      try {
        const clientResponse = await notion.databases.query({
          database_id: CLIENTS_DB,
          filter: {
            or: [
              {
                property: 'Project Address',
                rich_text: {
                  equals: address
                }
              },
              {
                property: 'Client Name',
                title: {
                  contains: address
                }
              }
            ]
          }
        });

        if (clientResponse.results.length > 0) {
          const clientPage = clientResponse.results[0];
          const props = clientPage.properties;
          
          clientInfo = {
            id: clientPage.id,
            name: getPageTitle(clientPage),
            address: props['Project Address']?.rich_text?.[0]?.plain_text || address,
            email: props['Email']?.email || '',
            status: props['Status']?.select?.name || 'Active',
            projectType: props['Project Type']?.select?.name || '',
            budgetRange: props['Budget Range']?.select?.name || '',
            projectManager: props['Project Manager']?.people?.[0]?.name || '',
            createdDate: props['Created Date']?.date?.start || '',
            lastLogin: props['Last Login']?.date?.start || ''
          };
        }
      } catch (error) {
        console.error('Error fetching client info:', error);
      }
    }

    // Get client documents
    let documents = [];
    if (CLIENT_DOCUMENTS_DB) {
      try {
        const docsResponse = await notion.databases.query({
          database_id: CLIENT_DOCUMENTS_DB,
          filter: {
            property: 'Client Address',
            relation: {
              contains: clientInfo?.id || ''
            }
          },
          sorts: [
            {
              property: 'Upload Date',
              direction: 'descending'
            }
          ]
        });

        documents = docsResponse.results.map(doc => {
          const props = doc.properties;
          return {
            id: doc.id,
            name: getPageTitle(doc),
            category: props['Category']?.select?.name || 'Document',
            uploadDate: props['Upload Date']?.date?.start || '',
            description: props['Description']?.rich_text?.[0]?.plain_text || '',
            uploadedBy: props['Uploaded By']?.people?.[0]?.name || '',
            status: props['Status']?.select?.name || 'Draft'
          };
        });
      } catch (error) {
        console.error('Error fetching client documents:', error);
      }
    }

    // Get recent activities
    let activities = [];
    if (CLIENT_ACTIVITIES_DB) {
      try {
        const activitiesResponse = await notion.databases.query({
          database_id: CLIENT_ACTIVITIES_DB,
          filter: {
            property: 'Client Address',
            rich_text: {
              equals: address
            }
          },
          sorts: [
            {
              property: 'Timestamp',
              direction: 'descending'
            }
          ]
        });

        activities = activitiesResponse.results.slice(0, 10).map(activity => {
          const props = activity.properties;
          return {
            id: activity.id,
            activity: getPageTitle(activity),
            type: props['Activity Type']?.select?.name || 'General',
            timestamp: props['Timestamp']?.date?.start || '',
            details: props['Details']?.rich_text?.[0]?.plain_text || ''
          };
        });
      } catch (error) {
        console.error('Error fetching client activities:', error);
      }
    }

    res.json({
      client: clientInfo,
      documents: documents,
      activities: activities,
      stats: {
        totalDocuments: documents.length,
        recentUploads: documents.filter(doc => {
          const uploadDate = new Date(doc.uploadDate);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return uploadDate > weekAgo;
        }).length,
        pendingItems: documents.filter(doc => doc.status === 'Review').length
      }
    });

  } catch (error) {
    console.error('Error fetching client data:', error);
    res.status(500).json({ error: 'Server error fetching client data' });
  }
});

// ============================================
// API ROUTES - DOCUMENT UPLOAD
// ============================================

app.post('/api/client/upload', upload.single('file'), async (req, res) => {
  try {
    const { address, category, description } = req.body;
    const file = req.file;

    if (!file || !address) {
      return res.status(400).json({ error: 'File and address are required' });
    }

    // Check if database ID is configured
    const documentsDbId = CLIENT_DOCUMENTS_DB || process.env.NOTION_PARENT_PAGE_ID;
    if (!documentsDbId) {
      console.error('CLIENT_DOCUMENTS_DB_ID or NOTION_PARENT_PAGE_ID not configured');
      return res.status(500).json({ error: 'Server configuration error: Documents database not configured' });
    }

    // Get file content from memory storage
    const fileContent = file.buffer;
    const fileName = file.originalname;

    // Create page in Notion with file reference
    // Note: Notion API doesn't support direct file uploads in the same way
    // We'll create a page with file info and upload link
    const page = await notion.pages.create({
      parent: { 
        database_id: documentsDbId
      },
      properties: {
        'Title': {
          title: [{ text: { content: fileName } }]
        },
        'Client Address': {
          rich_text: [{ text: { content: address } }]
        },
        'Category': {
          select: { name: category || 'Document' }
        },
        'Upload Date': {
          date: { start: new Date().toISOString() }
        },
        'Description': {
          rich_text: [{ text: { content: description || '' } }]
        }
      }
    });

    // Log activity
    await logActivity(address, 'Document Upload', { 
      fileName, 
      fileSize: file.size,
      category,
      pageId: page.id
    });

    // Send notification to team
    if (process.env.TEAM_EMAIL) {
      await sendEmail(
        process.env.TEAM_EMAIL,
        `New Document Upload: ${address}`,
        `
          <p>Client <strong>${address}</strong> uploaded a document:</p>
          <ul>
            <li><strong>File:</strong> ${fileName}</li>
            <li><strong>Size:</strong> ${(file.size / 1024).toFixed(2)} KB</li>
            <li><strong>Category:</strong> ${category || 'Document'}</li>
          </ul>
          <p><a href="${page.url}">View in Notion</a></p>
        `
      );
    }

    // Note: Using memory storage, no file cleanup needed
    // File is in memory buffer, not on disk

    res.json({ 
      success: true, 
      page: {
        id: page.id,
        url: page.url,
        fileName
      }
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    // Using memory storage, no file cleanup needed
    const errorMessage = error.message || 'Failed to upload document';
    res.status(500).json({ error: errorMessage });
  }
});

// ============================================
// EXISTING API ROUTES (from original server)
// ============================================

// Get all pages
app.get('/api/notion/pages', async (req, res) => {
  try {
    if (!process.env.NOTION_API_KEY) {
      return res.status(500).json({ 
        error: 'Notion API key not configured' 
      });
    }

    const response = await notion.search({
      query: '',
      filter: { property: 'object', value: 'page' }
    });

    const databaseCache = new Map();
    const teamspaceCache = new Map();
    
    const pages = await Promise.all(response.results.map(async (page) => {
      let databaseName = null;
      let teamspaceName = null;
      
      const dbId = page.parent?.database_id || page.parent?.data_source_id;
      if ((page.parent?.type === 'database_id' || page.parent?.type === 'data_source_id') && dbId) {
        if (!databaseCache.has(dbId)) {
          try {
            const database = await notion.databases.retrieve({ database_id: dbId });
            const dbTitle = database.title?.[0]?.plain_text || 'Untitled Database';
            
            let teamspace = 'Private Workspace';
            if (database.parent?.type === 'page_id') {
              const teamspaceId = database.parent.page_id;
              if (!teamspaceCache.has(teamspaceId)) {
                try {
                  const teamspacePage = await notion.pages.retrieve({ page_id: teamspaceId });
                  const teamspaceTitle = getPageTitle(teamspacePage);
                  teamspaceCache.set(teamspaceId, teamspaceTitle);
                } catch (err) {
                  teamspaceCache.set(teamspaceId, 'Unknown Space');
                }
              }
              teamspace = teamspaceCache.get(teamspaceId);
            }
            
            databaseCache.set(dbId, { name: dbTitle, teamspace: teamspace });
          } catch (err) {
            databaseCache.set(dbId, { name: null, teamspace: null });
          }
        }
        
        const dbInfo = databaseCache.get(dbId);
        databaseName = dbInfo?.name;
        teamspaceName = dbInfo?.teamspace;
      }

      return {
        id: page.id,
        title: getPageTitle(page),
        emoji: getPageEmoji(page),
        last_edited_time: page.last_edited_time,
        created_time: page.created_time,
        url: page.url,
        properties: page.properties,
        parent: page.parent,
        databaseName,
        teamspaceName,
        parentType: page.parent?.type,
        parentId: page.parent?.page_id || page.parent?.database_id || page.parent?.data_source_id
      };
    }));

    res.json(pages);
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ error: 'Failed to fetch pages from Notion' });
  }
});

// Get page content
app.get('/api/notion/pages/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    
    const [page, blocks] = await Promise.all([
      notion.pages.retrieve({ page_id: pageId }),
      notion.blocks.children.list({ block_id: pageId })
    ]);

    res.json({
      page: {
        ...page,
        title: getPageTitle(page),
        emoji: getPageEmoji(page)
      },
      blocks: blocks.results
    });
  } catch (error) {
    console.error('Error fetching page content:', error);
    res.status(500).json({ error: 'Failed to fetch page content' });
  }
});

// Get all databases
app.get('/api/notion/databases', async (req, res) => {
  try {
    const response = await notion.search({
      filter: { property: 'object', value: 'database' }
    });

    const databases = response.results.map(db => ({
      id: db.id,
      title: db.title?.[0]?.plain_text || 'Untitled',
      description: db.description?.[0]?.plain_text || '',
      url: db.url,
      properties: db.properties,
      created_time: db.created_time,
      last_edited_time: db.last_edited_time
    }));

    res.json(databases);
  } catch (error) {
    console.error('Error fetching databases:', error);
    res.status(500).json({ error: 'Failed to fetch databases' });
  }
});

// ============================================
// SAGE CHATGPT API ENDPOINT
// ============================================

app.post('/api/sage/chat', async (req, res) => {
  try {
    // Check if OpenAI is configured
    if (!openai) {
      return res.status(500).json({ 
        error: 'OpenAI API not configured. Please set OPENAI_API_KEY in your .env file.' 
      });
    }

    const { 
      message, 
      conversationHistory = [], 
      clientAddress = '',
      mode = 'client',
      currentView = 'hub',
      onboardingActive = false,
      onboardingStep = 0,
      isAskingAboutSupport = false
    } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build system prompt for Sage personality
    let systemPrompt = `You are Sage, a friendly and helpful AI assistant for the SAGE Garden Wizard platform (a landscape architecture client portal). 

Your personality:
- Warm, welcoming, and professional
- Use emojis sparingly but naturally (🧙‍♀️ for yourself)
- Be concise but thorough
- Helpful and proactive
- Knowledgeable about landscape architecture projects

Context:
- User: ${clientAddress || 'Client'}
- Mode: ${mode === 'client' ? 'Client Portal' : 'Team Dashboard'}
- Current View: ${currentView}
- Onboarding: ${onboardingActive ? `Active (Step ${onboardingStep})` : 'Not active'}

Available features in the Client Portal:
- 📄 Documents: View and manage project documents
- 💬 Messages: Contact project manager
- 📤 Upload: Share files with team
- 📊 Analytics: View project progress and insights
- 🔔 Notifications: Stay updated on project activity
- 📁 Projects: View project plans and deliverables

${mode === 'client' ? `
Client Portal Features:
- Dashboard with project overview
- Document management
- Messaging system
- File uploads
- Project progress tracking
- Analytics dashboard
` : `
Team Dashboard Features:
- Project management
- Deliverable tracking
- Client communications
- Task prioritization
`}

Guidelines:
- If user asks about onboarding, guide them through it naturally
- If user asks about features, explain clearly how to access them
- If user asks about their project, provide helpful context
- If user asks about support agents, pricing tiers, or service levels, explain the SAGE tier system (Tiers 1-3) and KAA white glove (Tier 4)
- Keep responses conversational and helpful
- If you don't know something specific, suggest they contact their project manager
- Always be encouraging and supportive

${isAskingAboutSupport ? `
IMPORTANT: The user is asking about support agents or pricing. Include detailed information about:
- Tier 1 (The Concept): Fully automated, no-touch service with fixed pricing - no site visit required
- Tier 2 (The Builder): Low-touch with designer checkpoints, fixed pricing - no site visit required
- Tier 3 (The Concierge): Includes site visits + 3D scan, hybrid approach with boots on the ground, fixed + site visit fee
- Tier 4 (KAA White Glove): Premium service, we choose clients, percentage of install pricing
` : ''}`;

    // Build conversation messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency, can upgrade to gpt-4o if needed
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
      top_p: 1,
      frequency_penalty: 0.3,
      presence_penalty: 0.3
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, but I encountered an error. Please try again.';

    res.json({ 
      response,
      usage: completion.usage
    });

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    
    // Handle specific OpenAI errors
    if (error.response) {
      return res.status(error.response.status || 500).json({ 
        error: error.response.data?.error?.message || 'OpenAI API error',
        details: error.response.data
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to get response from Sage',
      details: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    notion_configured: !!process.env.NOTION_API_KEY,
    email_configured: !!process.env.EMAIL_USER,
    openai_configured: !!process.env.OPENAI_API_KEY,
    stripe_configured: !!stripe,
    stripe_webhook_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
    databases_configured: !!(CLIENT_CREDENTIALS_DB && ACTIVITY_LOG_DB),
    timestamp: new Date().toISOString()
  });
});

// ============================================
// DESIGN IDEAS API ROUTES
// ============================================

// In-memory storage for design ideas (in production, use database)
const designIdeasStore = new Map();

// Get all design ideas for a client
app.get('/api/client/design-ideas/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const decodedAddress = decodeURIComponent(address);
    
    // Get all design ideas for this client
    const clientIdeas = Array.from(designIdeasStore.values())
      .filter(idea => idea.clientAddress === decodedAddress)
      .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    
    res.json({ designIdeas: clientIdeas });
  } catch (error) {
    console.error('Error fetching design ideas:', error);
    res.status(500).json({ error: 'Failed to fetch design ideas' });
  }
});

// Upload design idea image
app.post('/api/client/design-ideas/upload', upload.single('file'), async (req, res) => {
  try {
    const { address, title, description, tags } = req.body;
    const file = req.file;

    if (!file || !address) {
      return res.status(400).json({ error: 'File and address are required' });
    }

    // For now, we'll use a placeholder URL since we can't store files directly
    // In production, upload to Supabase Storage or S3
    const imageUrl = `https://via.placeholder.com/400x600?text=${encodeURIComponent(title || 'Design Idea')}`;
    
    const designIdea = {
      id: `di-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      imageUrl,
      title: title?.trim() || '',
      description: description?.trim() || '',
      source: 'upload',
      tags: tags ? JSON.parse(tags) : [],
      addedAt: new Date().toISOString(),
      clientAddress: address
    };

    designIdeasStore.set(designIdea.id, designIdea);

    res.json({ designIdea });
  } catch (error) {
    console.error('Error uploading design idea:', error);
    res.status(500).json({ error: 'Failed to upload design idea' });
  }
});

// Add design idea from URL
app.post('/api/client/design-ideas/add', async (req, res) => {
  try {
    const { address, imageUrl, title, description, tags, source } = req.body;

    if (!imageUrl || !address) {
      return res.status(400).json({ error: 'Image URL and address are required' });
    }

    const designIdea = {
      id: `di-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      imageUrl: imageUrl.trim(),
      title: title?.trim() || '',
      description: description?.trim() || '',
      source: source || 'url',
      tags: tags || [],
      addedAt: new Date().toISOString(),
      clientAddress: address
    };

    designIdeasStore.set(designIdea.id, designIdea);

    res.json({ designIdea });
  } catch (error) {
    console.error('Error adding design idea:', error);
    res.status(500).json({ error: 'Failed to add design idea' });
  }
});

// Import from Pinterest
app.post('/api/client/design-ideas/pinterest-import', async (req, res) => {
  try {
    const { address, boardUrl } = req.body;

    if (!boardUrl || !address) {
      return res.status(400).json({ error: 'Board URL and address are required' });
    }

    // TODO: Integrate with Pinterest API
    // For now, return demo data
    // In production, use Pinterest API to fetch board pins
    // You'll need: PINTEREST_APP_ID and PINTEREST_APP_SECRET in .env
    
    const demoIdeas = [
      {
        id: `di-${Date.now()}-1`,
        imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400',
        title: 'Modern Garden Design',
        description: 'Imported from Pinterest',
        source: 'pinterest',
        pinterestUrl: boardUrl,
        tags: ['Modern', 'Garden'],
        addedAt: new Date().toISOString(),
        clientAddress: address
      },
      {
        id: `di-${Date.now()}-2`,
        imageUrl: 'https://images.unsplash.com/photo-1464822759844-d150ad2996e3?w=400',
        title: 'Outdoor Living Space',
        description: 'Imported from Pinterest',
        source: 'pinterest',
        pinterestUrl: boardUrl,
        tags: ['Outdoor Living', 'Hardscape'],
        addedAt: new Date().toISOString(),
        clientAddress: address
      }
    ];

    demoIdeas.forEach(idea => {
      designIdeasStore.set(idea.id, idea);
    });

    res.json({ 
      designIdeas: demoIdeas,
      message: 'Pinterest import feature coming soon. For now, showing demo data.'
    });
  } catch (error) {
    console.error('Error importing from Pinterest:', error);
    res.status(500).json({ error: 'Failed to import from Pinterest' });
  }
});

// Delete design idea
app.delete('/api/client/design-ideas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { address } = req.body;

    const idea = designIdeasStore.get(id);

    if (!idea) {
      return res.status(404).json({ error: 'Design idea not found' });
    }

    if (idea.clientAddress !== address) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    designIdeasStore.delete(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting design idea:', error);
    res.status(500).json({ error: 'Failed to delete design idea' });
  }
});

// ============================================
// DELIVERABLES API ROUTES
// ============================================

// In-memory storage for deliverables (in production, use Prisma with Supabase)
const deliverablesStore = new Map();

// Get all deliverables for a project
app.get('/api/projects/:projectId/deliverables', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { address } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Get deliverables for this project (filtered by address if provided)
    const projectDeliverables = Array.from(deliverablesStore.values())
      .filter(d => {
        if (d.projectId !== projectId) return false;
        // If address is provided, filter by client address
        if (address && d.clientAddress !== address) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Log activity
    if (address) {
      await logActivity(address, 'Viewed Deliverables', { projectId });
    }

    res.json({
      deliverables: projectDeliverables,
      count: projectDeliverables.length
    });
  } catch (error) {
    console.error('Error fetching deliverables:', error);
    res.status(500).json({ error: 'Failed to fetch deliverables' });
  }
});

// Get all deliverables for a client (by address)
app.get('/api/client/:address/deliverables', async (req, res) => {
  try {
    const { address } = req.params;
    const decodedAddress = decodeURIComponent(address);

    if (!decodedAddress) {
      return res.status(400).json({ error: 'Client address is required' });
    }

    // Get all deliverables for this client
    const clientDeliverables = Array.from(deliverablesStore.values())
      .filter(d => d.clientAddress === decodedAddress)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    await logActivity(decodedAddress, 'Viewed All Deliverables', { count: clientDeliverables.length });

    res.json({
      deliverables: clientDeliverables,
      count: clientDeliverables.length
    });
  } catch (error) {
    console.error('Error fetching client deliverables:', error);
    res.status(500).json({ error: 'Failed to fetch deliverables' });
  }
});

// Create a new deliverable (Team/Admin only)
// Supports Option A (file upload to Supabase Storage) and Option B (external link)
app.post('/api/projects/:projectId/deliverables', upload.single('file'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      name,
      description,
      category,
      fileUrl,        // Option B: External link
      clientAddress,
      clientEmail,
      uploadedBy,
      userType        // 'team' or 'admin' required
    } = req.body;
    const file = req.file;  // Option A: File upload

    // Authorization check - only team/admin can create deliverables
    if (!userType || !['team', 'admin', 'TEAM', 'ADMIN'].includes(userType)) {
      return res.status(403).json({
        error: 'Unauthorized. Only team members and admins can upload deliverables.'
      });
    }

    if (!projectId || !name) {
      return res.status(400).json({ error: 'Project ID and name are required' });
    }

    // Must have either file or external URL
    if (!file && !fileUrl) {
      return res.status(400).json({
        error: 'Either a file upload or external URL is required'
      });
    }

    let deliverableUrl = '';
    let fileSize = 0;
    let fileType = '';
    let filePath = '';
    let deliveryMethod = '';

    if (file) {
      // Option A: File upload (to Supabase Storage in production)
      // For MVP, we'll store file metadata and use a placeholder URL
      // In production, upload to Supabase Storage bucket

      fileSize = file.size;
      fileType = file.mimetype;
      filePath = `deliverables/${projectId}/${Date.now()}-${file.originalname}`;

      // TODO: In production, upload to Supabase Storage:
      // const { data, error } = await supabase.storage
      //   .from('deliverables')
      //   .upload(filePath, file.buffer, { contentType: file.mimetype });
      // deliverableUrl = supabase.storage.from('deliverables').getPublicUrl(filePath).data.publicUrl;

      // For MVP, use a data URL for small files or placeholder for large files
      if (file.size < 1024 * 1024) { // Less than 1MB
        const base64 = file.buffer.toString('base64');
        deliverableUrl = `data:${file.mimetype};base64,${base64}`;
      } else {
        // For larger files, we'd need Supabase Storage
        // For now, indicate file is stored server-side
        deliverableUrl = `#file-stored:${filePath}`;
      }

      deliveryMethod = 'upload';
      console.log(`📦 Deliverable file received: ${file.originalname} (${(file.size / 1024).toFixed(2)} KB)`);
    } else {
      // Option B: External URL
      deliverableUrl = fileUrl.trim();
      fileType = 'external-link';
      fileSize = 0;
      filePath = deliverableUrl;
      deliveryMethod = 'link';
      console.log(`🔗 Deliverable link added: ${deliverableUrl}`);
    }

    // Create deliverable record
    const deliverable = {
      id: `del-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      name: name.trim(),
      description: description?.trim() || '',
      category: category || 'Document',
      fileUrl: deliverableUrl,
      filePath,
      fileSize,
      fileType,
      deliveryMethod,
      clientAddress: clientAddress || '',
      uploadedBy: uploadedBy || 'Team',
      userType: userType.toUpperCase(),
      createdAt: new Date().toISOString(),
      downloadCount: 0
    };

    deliverablesStore.set(deliverable.id, deliverable);

    // Log activity
    await logActivity(clientAddress || 'System', 'Deliverable Created', {
      deliverableId: deliverable.id,
      name: deliverable.name,
      category: deliverable.category,
      deliveryMethod,
      uploadedBy
    });

    // Send "Deliverable Ready" notification email to client
    if (clientEmail) {
      await sendEmail(
        clientEmail,
        `New Deliverable Ready: ${name}`,
        `
          <h2>Your Deliverable is Ready!</h2>
          <p>Great news! A new deliverable has been uploaded for your project.</p>
          <hr>
          <p><strong>Deliverable:</strong> ${name}</p>
          ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
          <p><strong>Category:</strong> ${category || 'Document'}</p>
          <p><strong>Uploaded by:</strong> ${uploadedBy || 'KAA Team'}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <hr>
          <p>
            <a href="${process.env.FRONTEND_URL || 'https://kaa-app.vercel.app'}"
               style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View in Portal
            </a>
          </p>
          <p>Log in to your client portal to download your deliverable.</p>
          <p style="color: #666; font-size: 0.9em;">If you have any questions, please contact your project manager.</p>
        `
      );
      console.log(`📧 Deliverable notification sent to ${clientEmail}`);
    }

    // Also notify team email
    if (process.env.TEAM_EMAIL) {
      await sendEmail(
        process.env.TEAM_EMAIL,
        `Deliverable Uploaded: ${name}`,
        `
          <p>A new deliverable has been uploaded:</p>
          <ul>
            <li><strong>Project:</strong> ${projectId}</li>
            <li><strong>Name:</strong> ${name}</li>
            <li><strong>Category:</strong> ${category || 'Document'}</li>
            <li><strong>Client:</strong> ${clientAddress || 'N/A'}</li>
            <li><strong>Uploaded by:</strong> ${uploadedBy || 'Team'}</li>
            <li><strong>Method:</strong> ${deliveryMethod}</li>
          </ul>
        `
      );
    }

    res.json({
      success: true,
      deliverable: {
        id: deliverable.id,
        name: deliverable.name,
        category: deliverable.category,
        fileUrl: deliverable.fileUrl,
        createdAt: deliverable.createdAt
      },
      message: clientEmail ? 'Deliverable created and client notified' : 'Deliverable created'
    });
  } catch (error) {
    console.error('Error creating deliverable:', error);
    res.status(500).json({ error: 'Failed to create deliverable' });
  }
});

// Track deliverable download
app.post('/api/deliverables/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const { address } = req.body;

    const deliverable = deliverablesStore.get(id);

    if (!deliverable) {
      return res.status(404).json({ error: 'Deliverable not found' });
    }

    // Increment download count
    deliverable.downloadCount = (deliverable.downloadCount || 0) + 1;
    deliverable.lastDownloadedAt = new Date().toISOString();
    deliverablesStore.set(id, deliverable);

    // Log activity
    await logActivity(address || 'Anonymous', 'Downloaded Deliverable', {
      deliverableId: id,
      name: deliverable.name,
      downloadCount: deliverable.downloadCount
    });

    res.json({
      success: true,
      fileUrl: deliverable.fileUrl,
      downloadCount: deliverable.downloadCount
    });
  } catch (error) {
    console.error('Error tracking download:', error);
    res.status(500).json({ error: 'Failed to track download' });
  }
});

// Delete deliverable (Team/Admin only)
app.delete('/api/deliverables/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userType } = req.body;

    // Authorization check
    if (!userType || !['team', 'admin', 'TEAM', 'ADMIN'].includes(userType)) {
      return res.status(403).json({
        error: 'Unauthorized. Only team members and admins can delete deliverables.'
      });
    }

    const deliverable = deliverablesStore.get(id);

    if (!deliverable) {
      return res.status(404).json({ error: 'Deliverable not found' });
    }

    deliverablesStore.delete(id);

    // Log activity
    await logActivity('System', 'Deliverable Deleted', {
      deliverableId: id,
      name: deliverable.name
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting deliverable:', error);
    res.status(500).json({ error: 'Failed to delete deliverable' });
  }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, async () => {
  console.log(`🚀 KAA Enhanced API Server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  
  if (!process.env.NOTION_API_KEY) {
    console.log('⚠️  WARNING: NOTION_API_KEY not set');
  } else {
    console.log('✅ Notion API key configured');
  }
  
  if (!process.env.EMAIL_USER) {
    console.log('⚠️  WARNING: Email not configured (EMAIL_USER, EMAIL_PASSWORD)');
  } else {
    console.log('✅ Email configured');
  }
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  WARNING: OpenAI API key not set - Sage ChatGPT features will not work');
    console.log('   Set OPENAI_API_KEY in your .env file to enable intelligent Sage conversations');
  } else {
    console.log('✅ OpenAI API configured - Sage ChatGPT enabled');
  }

  if (!stripe) {
    console.log('⚠️  WARNING: Stripe not configured (STRIPE_SECRET_KEY)');
    console.log('   Set STRIPE_SECRET_KEY in your .env file to enable payments');
  } else {
    console.log('✅ Stripe API configured');
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.log('⚠️  WARNING: Stripe webhook secret not set (STRIPE_WEBHOOK_SECRET)');
    console.log('   Set STRIPE_WEBHOOK_SECRET to enable webhook signature verification');
  } else {
    console.log('✅ Stripe webhook configured');
  }

  // Initialize databases
  await initializeDatabases();
});

module.exports = app;

