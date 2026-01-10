/**
 * Email Service
 *
 * Handles transactional emails using Resend.
 * Supports welcome emails, project updates, deliverables, and password reset.
 */

import { Resend } from 'resend';
import { logger } from '../config/logger';
import { captureException } from '../config/sentry';

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || 'SAGE <noreply@sage.com>';
const APP_NAME = process.env.APP_NAME || 'SAGE';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// ========================================
// Types
// ========================================

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WelcomeEmailData {
  email: string;
  name?: string;
  tier: number;
  tierName: string;
  projectName: string;
}

export interface ProjectStatusEmailData {
  email: string;
  name?: string;
  projectName: string;
  milestoneName: string;
  newStatus: string;
  projectUrl: string;
}

export interface DeliverableReadyEmailData {
  email: string;
  name?: string;
  projectName: string;
  deliverableName: string;
  downloadUrl: string;
  projectUrl: string;
}

export interface PasswordResetEmailData {
  email: string;
  name?: string;
  resetToken: string;
  expiresIn: string;
}

// ========================================
// Email Templates
// ========================================

const templates = {
  welcome: (data: WelcomeEmailData) => ({
    subject: `Welcome to ${APP_NAME} - Your ${data.tierName} Journey Begins!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #2d5a3d 0%, #4a7c59 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🌱 Welcome to ${APP_NAME}</h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Hi${data.name ? ` ${data.name}` : ''},
        </p>

        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Thank you for choosing ${APP_NAME}! Your payment has been confirmed and your project <strong>"${data.projectName}"</strong> is ready to begin.
        </p>

        <div style="background-color: #f8faf8; border-left: 4px solid #4a7c59; padding: 20px; margin: 30px 0;">
          <h3 style="margin: 0 0 10px 0; color: #2d5a3d;">Your Package: ${data.tierName}</h3>
          <p style="margin: 0; color: #666;">Tier ${data.tier} - Full access to your client portal</p>
        </div>

        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          <strong>What's next?</strong>
        </p>
        <ul style="font-size: 16px; color: #333; line-height: 1.8;">
          <li>Access your <a href="${APP_URL}/dashboard" style="color: #4a7c59;">Client Portal</a></li>
          <li>Track your project milestones</li>
          <li>Download deliverables when ready</li>
          <li>Communicate with your designer</li>
        </ul>

        <div style="text-align: center; margin: 40px 0;">
          <a href="${APP_URL}/dashboard" style="display: inline-block; background-color: #4a7c59; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Go to Dashboard
          </a>
        </div>

        <p style="font-size: 14px; color: #666; line-height: 1.6;">
          If you have any questions, simply reply to this email or reach out to our support team.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f5f5f5; padding: 30px; text-align: center;">
        <p style="font-size: 12px; color: #999; margin: 0;">
          © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `
Welcome to ${APP_NAME}!

Hi${data.name ? ` ${data.name}` : ''},

Thank you for choosing ${APP_NAME}! Your payment has been confirmed and your project "${data.projectName}" is ready to begin.

Your Package: ${data.tierName} (Tier ${data.tier})

What's next?
- Access your Client Portal: ${APP_URL}/dashboard
- Track your project milestones
- Download deliverables when ready
- Communicate with your designer

If you have any questions, simply reply to this email.

© ${new Date().getFullYear()} ${APP_NAME}
    `,
  }),

  projectStatus: (data: ProjectStatusEmailData) => ({
    subject: `Project Update: ${data.milestoneName} is now ${data.newStatus}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="background: linear-gradient(135deg, #2d5a3d 0%, #4a7c59 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📋 Project Update</h1>
      </td>
    </tr>

    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 16px; color: #333;">Hi${data.name ? ` ${data.name}` : ''},</p>

        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Great news! Your project <strong>"${data.projectName}"</strong> has been updated.
        </p>

        <div style="background-color: #e8f5e9; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #666;">Milestone</p>
          <h2 style="margin: 0 0 10px 0; color: #2d5a3d;">${data.milestoneName}</h2>
          <span style="display: inline-block; background-color: #4a7c59; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px;">
            ${data.newStatus}
          </span>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="${data.projectUrl}" style="display: inline-block; background-color: #4a7c59; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Project
          </a>
        </div>
      </td>
    </tr>

    <tr>
      <td style="background-color: #f5f5f5; padding: 30px; text-align: center;">
        <p style="font-size: 12px; color: #999; margin: 0;">
          © ${new Date().getFullYear()} ${APP_NAME}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `
Project Update

Hi${data.name ? ` ${data.name}` : ''},

Great news! Your project "${data.projectName}" has been updated.

Milestone: ${data.milestoneName}
Status: ${data.newStatus}

View your project: ${data.projectUrl}

© ${new Date().getFullYear()} ${APP_NAME}
    `,
  }),

  deliverableReady: (data: DeliverableReadyEmailData) => ({
    subject: `🎉 New Deliverable Ready: ${data.deliverableName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="background: linear-gradient(135deg, #2d5a3d 0%, #4a7c59 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📦 Deliverable Ready!</h1>
      </td>
    </tr>

    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 16px; color: #333;">Hi${data.name ? ` ${data.name}` : ''},</p>

        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          A new deliverable is ready for your project <strong>"${data.projectName}"</strong>!
        </p>

        <div style="background-color: #fff8e1; border: 1px solid #ffe082; border-radius: 8px; padding: 20px; margin: 30px 0;">
          <h3 style="margin: 0 0 10px 0; color: #f57c00;">📄 ${data.deliverableName}</h3>
          <p style="margin: 0; color: #666; font-size: 14px;">
            This file is now available for download in your client portal.
          </p>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="${data.projectUrl}" style="display: inline-block; background-color: #4a7c59; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">
            View in Portal
          </a>
        </div>

        <p style="font-size: 14px; color: #666; line-height: 1.6;">
          Log in to your portal to download the file and view all project deliverables.
        </p>
      </td>
    </tr>

    <tr>
      <td style="background-color: #f5f5f5; padding: 30px; text-align: center;">
        <p style="font-size: 12px; color: #999; margin: 0;">
          © ${new Date().getFullYear()} ${APP_NAME}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `
New Deliverable Ready!

Hi${data.name ? ` ${data.name}` : ''},

A new deliverable is ready for your project "${data.projectName}"!

File: ${data.deliverableName}

View in your portal: ${data.projectUrl}

Log in to download the file and view all project deliverables.

© ${new Date().getFullYear()} ${APP_NAME}
    `,
  }),

  passwordReset: (data: PasswordResetEmailData) => ({
    subject: `Reset Your ${APP_NAME} Password`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="background: linear-gradient(135deg, #2d5a3d 0%, #4a7c59 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔐 Password Reset</h1>
      </td>
    </tr>

    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 16px; color: #333;">Hi${data.name ? ` ${data.name}` : ''},</p>

        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          We received a request to reset your password. Click the button below to create a new password.
        </p>

        <div style="text-align: center; margin: 40px 0;">
          <a href="${APP_URL}/reset-password?token=${data.resetToken}" style="display: inline-block; background-color: #4a7c59; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset Password
          </a>
        </div>

        <p style="font-size: 14px; color: #666; line-height: 1.6;">
          This link will expire in <strong>${data.expiresIn}</strong>.
        </p>

        <p style="font-size: 14px; color: #666; line-height: 1.6;">
          If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="font-size: 12px; color: #999; line-height: 1.6;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${APP_URL}/reset-password?token=${data.resetToken}" style="color: #4a7c59; word-break: break-all;">
            ${APP_URL}/reset-password?token=${data.resetToken}
          </a>
        </p>
      </td>
    </tr>

    <tr>
      <td style="background-color: #f5f5f5; padding: 30px; text-align: center;">
        <p style="font-size: 12px; color: #999; margin: 0;">
          © ${new Date().getFullYear()} ${APP_NAME}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `
Password Reset Request

Hi${data.name ? ` ${data.name}` : ''},

We received a request to reset your password. Visit the link below to create a new password:

${APP_URL}/reset-password?token=${data.resetToken}

This link will expire in ${data.expiresIn}.

If you didn't request this password reset, you can safely ignore this email.

© ${new Date().getFullYear()} ${APP_NAME}
    `,
  }),
};

// ========================================
// Email Sending Functions
// ========================================

/**
 * Send an email using Resend
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<EmailResult> {
  if (!resend) {
    logger.warn('Email service not configured - RESEND_API_KEY missing', { to, subject });
    return {
      success: false,
      error: 'Email service not configured',
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      logger.error('Failed to send email', { to, subject, error: error.message });
      captureException(new Error(error.message), { to, subject });
      return {
        success: false,
        error: error.message,
      };
    }

    logger.info('Email sent successfully', { to, subject, messageId: data?.id });
    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Email sending failed', { to, subject }, error as Error);
    captureException(error as Error, { to, subject });
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Send welcome email after payment
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<EmailResult> {
  const template = templates.welcome(data);
  return sendEmail(data.email, template.subject, template.html, template.text);
}

/**
 * Send project status update email
 */
export async function sendProjectStatusEmail(data: ProjectStatusEmailData): Promise<EmailResult> {
  const template = templates.projectStatus(data);
  return sendEmail(data.email, template.subject, template.html, template.text);
}

/**
 * Send deliverable ready notification
 */
export async function sendDeliverableReadyEmail(data: DeliverableReadyEmailData): Promise<EmailResult> {
  const template = templates.deliverableReady(data);
  return sendEmail(data.email, template.subject, template.html, template.text);
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<EmailResult> {
  const template = templates.passwordReset(data);
  return sendEmail(data.email, template.subject, template.html, template.text);
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return resend !== null;
}

export default {
  sendWelcomeEmail,
  sendProjectStatusEmail,
  sendDeliverableReadyEmail,
  sendPasswordResetEmail,
  isConfigured: isEmailConfigured,
};
