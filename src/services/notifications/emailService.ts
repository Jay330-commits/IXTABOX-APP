import 'server-only';
import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Simple email service using nodemailer with SMTP
 */
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (!smtpHost || !smtpUser || !smtpPassword) {
      throw new Error('SMTP configuration missing. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.');
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    return this.transporter;
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const transporter = this.getTransporter();
      const senderEmail = process.env.SMTP_SENDER_EMAIL || process.env.SMTP_USER;
      const senderName = process.env.SMTP_SENDER_NAME || 'IXTArent';

      if (!options.text && !options.html) {
        throw new Error('Email must have text or html content');
      }

      const info = await transporter.sendMail({
        from: `${senderName} <${senderEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      console.log('Email sent to:', options.to);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Failed to send email:', error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(params: {
    to: string;
    boxNumber?: string;
    standNumber?: string;
    locationName: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    unlockCode: string;
    padlockCode: string;
    helpUrl?: string;
  }): Promise<EmailResult> {
    const boxStand = [
      params.boxNumber && `Box ${params.boxNumber}`,
      params.standNumber && `Stand ${params.standNumber}`,
    ]
      .filter(Boolean)
      .join(', ');

    const text = `You have booked: ${boxStand}
Location: ${params.locationName}
Date: ${params.startDate} – ${params.endDate}
Time: ${params.startTime.padStart(11)} ${params.endTime}

Get started with the following steps:
1) Unlock Code to unlock: ${params.unlockCode}
2x Padlock for box code: ${params.padlockCode}

2) Take photos before use (30 min) (recommended)

Need help? ${params.helpUrl || 'https://ixtarent.com/help'}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #06b6d4; color: white; padding: 20px; text-align: center; }
    .content { background-color: #ffffff; padding: 20px; }
    .booking-info { background-color: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .info-row { margin: 10px 0; }
    .info-label { font-weight: bold; color: #6b7280; }
    .info-value { color: #111827; }
    .steps { margin: 20px 0; }
    .step { margin: 15px 0; padding-left: 20px; }
    .code { font-size: 18px; font-weight: bold; color: #06b6d4; margin: 5px 0; }
    .help-link { margin-top: 20px; text-align: center; }
    .help-link a { color: #06b6d4; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Booking Confirmation</h1>
    </div>
    <div class="content">
      <p>You have booked: <strong>${boxStand}</strong></p>
      
      <div class="booking-info">
        <div class="info-row">
          <span class="info-label">Location:</span>
          <span class="info-value">${params.locationName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date:</span>
          <span class="info-value">${params.startDate} – ${params.endDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Time:</span>
          <span class="info-value">${params.startTime} ${params.endTime}</span>
        </div>
      </div>

      <div class="steps">
        <p><strong>Get started with the following steps:</strong></p>
        <div class="step">
          <p><strong>1) Unlock Code to unlock:</strong></p>
          <div class="code">${params.unlockCode}</div>
          <p><strong>2x Padlock for box code:</strong></p>
          <div class="code">${params.padlockCode}</div>
        </div>
        <div class="step">
          <p><strong>2) Take photos before use (30 min) (recommended)</strong></p>
        </div>
      </div>

      <div class="help-link">
        <p>Need help? <a href="${params.helpUrl || 'https://ixtarent.com/help'}">${params.helpUrl || 'https://ixtarent.com/help'}</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to: params.to,
      subject: 'Booking Confirmation - IXTArent',
      text,
      html,
    });
  }

  /**
   * Send box return confirmation email
   */
  async sendBoxReturnConfirmation(params: {
    to: string;
    bookingId: string;
    locationName: string;
    boxNumber: string;
    standNumber: string;
    returnDate: string;
    returnTime: string;
    photos: {
      boxFrontView: string;
      boxBackView: string;
      closedStandLock: string;
    };
    depositReleased: boolean;
    helpUrl?: string;
  }): Promise<EmailResult> {
    const boxStand = `Box ${params.boxNumber}, Stand ${params.standNumber}`;

    const text = `Box Return Confirmation

Your box has been successfully returned:
${boxStand}
Location: ${params.locationName}
Return Date: ${params.returnDate}
Return Time: ${params.returnTime}

${params.depositReleased ? 'Your deposit has been released.' : 'Your deposit will be processed shortly.'}

Return photos have been recorded:
- Box Front View: ${params.photos.boxFrontView}
- Box Back View: ${params.photos.boxBackView}
- Closed Stand with Lock: ${params.photos.closedStandLock}

Thank you for using IXTArent!

Need help? ${params.helpUrl || 'https://ixtarent.com/help'}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
    .content { background-color: #ffffff; padding: 20px; }
    .return-info { background-color: #f0fdf4; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #10b981; }
    .info-row { margin: 10px 0; }
    .info-label { font-weight: bold; color: #6b7280; }
    .info-value { color: #111827; }
    .deposit-info { background-color: #fef3c7; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #f59e0b; }
    .photos-section { margin: 20px 0; }
    .photo-item { margin: 10px 0; padding: 10px; background-color: #f9fafb; border-radius: 5px; }
    .photo-label { font-weight: bold; color: #06b6d4; }
    .photo-link { color: #06b6d4; text-decoration: none; word-break: break-all; }
    .help-link { margin-top: 20px; text-align: center; }
    .help-link a { color: #06b6d4; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Box Return Confirmation</h1>
    </div>
    <div class="content">
      <p>Your box has been successfully returned!</p>
      
      <div class="return-info">
        <div class="info-row">
          <span class="info-label">Box & Stand:</span>
          <span class="info-value">${boxStand}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Location:</span>
          <span class="info-value">${params.locationName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Return Date:</span>
          <span class="info-value">${params.returnDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Return Time:</span>
          <span class="info-value">${params.returnTime}</span>
        </div>
      </div>

      ${params.depositReleased 
        ? `<div class="deposit-info">
            <p><strong>Your deposit has been released.</strong></p>
          </div>`
        : `<div class="deposit-info">
            <p><strong>Your deposit will be processed shortly.</strong></p>
          </div>`
      }

      <div class="photos-section">
        <p><strong>Return Photos Recorded:</strong></p>
        <div class="photo-item">
          <div class="photo-label">Box Front View:</div>
          <a href="${params.photos.boxFrontView}" class="photo-link" target="_blank">${params.photos.boxFrontView}</a>
        </div>
        <div class="photo-item">
          <div class="photo-label">Box Back View:</div>
          <a href="${params.photos.boxBackView}" class="photo-link" target="_blank">${params.photos.boxBackView}</a>
        </div>
        <div class="photo-item">
          <div class="photo-label">Closed Stand with Lock:</div>
          <a href="${params.photos.closedStandLock}" class="photo-link" target="_blank">${params.photos.closedStandLock}</a>
        </div>
      </div>

      <p style="margin-top: 20px;">Thank you for using IXTArent!</p>

      <div class="help-link">
        <p>Need help? <a href="${params.helpUrl || 'https://ixtarent.com/help'}">${params.helpUrl || 'https://ixtarent.com/help'}</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to: params.to,
      subject: 'Box Return Confirmation - IXTArent',
      text,
      html,
    });
  }
}
