/**
 * Email Service for KAA Client Portal
 * Handles sending various email notifications
 */

const nodemailer = require('nodemailer');

// Create transporter (configured from environment)
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

/**
 * Send portal access email to new client after successful payment
 * @param {string} email - Client's email address
 * @param {object} data - Portal access data
 * @param {string} data.accessCode - Generated access code
 * @param {string} data.projectAddress - Project address
 * @param {number} data.tier - Service tier (1-4)
 * @param {string} data.projectName - Name of the project
 * @returns {Promise<boolean>} - True if email sent successfully
 */
async function sendPortalAccessEmail(email, data) {
  const { accessCode, projectAddress, tier, projectName } = data;

  const tierNames = {
    1: 'The Concept',
    2: 'The Builder',
    3: 'The Concierge',
    4: 'KAA White Glove'
  };

  const tierName = tierNames[tier] || `Tier ${tier}`;
  const frontendUrl = process.env.FRONTEND_URL || 'https://kaa-app.vercel.app';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2d5016; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .highlight { background: #e8f5e9; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .code { font-size: 24px; font-weight: bold; color: #2d5016; letter-spacing: 2px; }
        .button { display: inline-block; background: #2d5016; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to SAGE Garden Wizard</h1>
        </div>
        <div class="content">
          <h2>Your Client Portal is Ready!</h2>
          <p>Thank you for choosing SAGE for your landscape design project. Your payment has been processed successfully.</p>

          <div class="highlight">
            <p><strong>Project:</strong> ${projectName || projectAddress}</p>
            <p><strong>Service Tier:</strong> ${tierName}</p>
            <p><strong>Project Address:</strong> ${projectAddress}</p>
          </div>

          <h3>Your Access Credentials</h3>
          <p>Use the following access code to log into your client portal:</p>

          <div class="highlight" style="text-align: center;">
            <p class="code">${accessCode}</p>
          </div>

          <p style="text-align: center;">
            <a href="${frontendUrl}" class="button">Access Your Portal</a>
          </p>

          <h3>What's Next?</h3>
          <ul>
            <li>Log into your portal using your project address and access code</li>
            <li>Upload any reference photos or documents</li>
            <li>Your project manager will reach out within 24-48 hours</li>
            <li>Track your project progress in real-time</li>
          </ul>

          <p>If you have any questions, don't hesitate to reach out to your project manager through the portal messaging system.</p>
        </div>
        <div class="footer">
          <p>SAGE Garden Wizard | Landscape Architecture Made Simple</p>
          <p>If you did not make this purchase, please contact us immediately.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    if (!process.env.EMAIL_USER) {
      console.log('Email not configured - would send portal access email to:', email);
      return true; // Return true in dev mode
    }

    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Welcome to SAGE - Your Portal Access for ${projectAddress}`,
      html
    });

    console.log(`Portal access email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending portal access email:', error.message);
    throw error;
  }
}

/**
 * Send generic email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @returns {Promise<boolean>}
 */
async function sendEmail(to, subject, html) {
  try {
    if (!process.env.EMAIL_USER) {
      console.log('Email not configured - would send:', { to, subject });
      return true;
    }

    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    });

    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw error;
  }
}

module.exports = {
  sendPortalAccessEmail,
  sendEmail,
  createTransporter
};
