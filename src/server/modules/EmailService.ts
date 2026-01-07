import { pino } from '@/libs/logger';

export interface EmailOptions {
  html?: string;
  subject: string;
  text?: string;
  to: string;
}

/**
 * Email service for sending transactional emails
 * Currently uses console logging (development mode)
 * TODO: Integrate with actual email provider (SendGrid, AWS SES, etc.)
 */
export class EmailService {
  private readonly from: string;
  private readonly enabled: boolean;

  constructor() {
    // Get configuration from environment variables
    this.from = process.env.EMAIL_FROM || 'noreply@lobechat.com';
    this.enabled = process.env.EMAIL_ENABLED === 'true';

    if (!this.enabled) {
      pino.warn('Email service is disabled. Set EMAIL_ENABLED=true to enable.');
    }
  }

  /**
   * Send an email
   */
  async send(options: EmailOptions): Promise<boolean> {
    if (!this.enabled) {
      pino.info(
        {
          from: this.from,
          subject: options.subject,
          to: options.to,
        },
        '[EMAIL_DISABLED] Would send email',
      );
      return false;
    }

    try {
      // TODO: Implement actual email sending
      // For now, just log the email content
      pino.info(
        {
          from: this.from,
          html: options.html?.slice(0, 100),
          subject: options.subject,
          to: options.to,
        },
        '[EMAIL] Sending email',
      );

      // Simulate email sending
      return true;
    } catch (error) {
      pino.error({ error }, '[EMAIL] Failed to send email');
      return false;
    }
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(to: string, token: string, username?: string): Promise<boolean> {
    const verifyUrl = `${this.getBaseUrl()}/verify-email?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email Address</h2>
        <p>Hi ${username || 'there'},</p>
        <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
        <div style="margin: 30px 0;">
          <a href="${verifyUrl}"
             style="background-color: #0070f3; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${verifyUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">
          This is an automated email from LobeChat. Please do not reply.
        </p>
      </div>
    `;

    const text = `
Hi ${username || 'there'},

Thank you for registering! Please verify your email address by visiting:
${verifyUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.
    `;

    return this.send({
      html,
      subject: 'Verify your email address',
      text,
      to,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, token: string, username?: string): Promise<boolean> {
    const resetUrl = `${this.getBaseUrl()}/reset-password?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>Hi ${username || 'there'},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #0070f3; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.
           Your password will remain unchanged.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">
          This is an automated email from LobeChat. Please do not reply.
        </p>
      </div>
    `;

    const text = `
Hi ${username || 'there'},

We received a request to reset your password. Visit the link below to create a new password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.
    `;

    return this.send({
      html,
      subject: 'Reset your password',
      text,
      to,
    });
  }

  /**
   * Send welcome email after successful registration
   */
  async sendWelcomeEmail(to: string, username?: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to LobeChat! 🤯</h2>
        <p>Hi ${username || 'there'},</p>
        <p>Your account has been successfully created. You can now start using LobeChat!</p>
        <div style="margin: 30px 0;">
          <a href="${this.getBaseUrl()}"
             style="background-color: #0070f3; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Get Started
          </a>
        </div>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">
          This is an automated email from LobeChat. Please do not reply.
        </p>
      </div>
    `;

    const text = `
Hi ${username || 'there'},

Welcome to LobeChat! Your account has been successfully created.

Visit ${this.getBaseUrl()} to get started.

If you have any questions, feel free to reach out to our support team.
    `;

    return this.send({
      html,
      subject: 'Welcome to LobeChat!',
      text,
      to,
    });
  }

  /**
   * Get base URL from environment or default
   */
  private getBaseUrl(): string {
    return (
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXTAUTH_URL ||
      process.env.VERCEL_URL ||
      'http://localhost:3210'
    );
  }
}
