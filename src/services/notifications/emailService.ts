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
   * Send booking confirmation email.
   * Unlock code is NOT included for security - it is sent separately 15 minutes before booking start.
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
    /** @deprecated Unlock code is no longer sent in confirmation - use sendUnlockCodeEmail 15 min before start */
    unlockCode?: string;
    helpUrl?: string;
    bookingsUrl?: string;
    chargeId?: string;
  }): Promise<EmailResult> {
    const boxStand = [
      params.boxNumber && `Box ${params.boxNumber}`,
      params.standNumber && `Stand ${params.standNumber}`,
    ]
      .filter(Boolean)
      .join(', ');

    const unlockCodeSection = params.unlockCode
      ? `1) Igloo lock code to unlock: ${params.unlockCode}\n\n2)`
      : `1) Your igloo lock code will be sent by email when your booking starts. You can also view it in your bookings at that time.\n\n2)`;

    const text = `You have booked: ${boxStand}
Location: ${params.locationName}
Date: ${params.startDate} – ${params.endDate}
Time: ${params.startTime.padStart(11)} ${params.endTime}

Get started with the following steps:
${unlockCodeSection} Take photos before use (30 min) (recommended)

Need help? ${params.helpUrl || 'https://ixtarent.com/support'}

${params.bookingsUrl ? `View your bookings: ${params.bookingsUrl}` : ''}`;

    const unlockCodeHtml = params.unlockCode
      ? `<p><strong>1) Igloo lock code to unlock:</strong> ${params.unlockCode}</p>
        <p><strong>2) Take photos before use (30 min)</strong> (recommended)</p>`
      : `<p><strong>1) Your igloo lock code</strong> will be sent by email when your booking starts. You can also view it in your bookings at that time.</p>
        <p><strong>2) Take photos before use (30 min)</strong> (recommended)</p>`;

    const html = `
<p><strong>Booking Confirmation</strong></p>
<p>You have booked: <strong>${boxStand}</strong></p>
<p><strong>Location:</strong> ${params.locationName}</p>
<p><strong>Date:</strong> ${params.startDate} – ${params.endDate}</p>
<p><strong>Time:</strong> ${params.startTime} ${params.endTime}</p>
<p><strong>Get started with the following steps:</strong></p>
${unlockCodeHtml}
${params.bookingsUrl ? `<p><a href="${params.bookingsUrl}">View your bookings</a>${params.chargeId ? ` (Payment ID: ${params.chargeId})` : ''}</p>` : ''}
<p>Need help? <a href="${params.helpUrl || 'https://ixtarent.com/support'}">${params.helpUrl || 'https://ixtarent.com/support'}</a></p>`;

    return this.sendEmail({
      to: params.to,
      subject: 'Booking Confirmation - IXTArent',
      text,
      html,
    });
  }

  /**
   * Send unlock code email at booking start time
   */
  async sendUnlockCodeEmail(params: {
    to: string;
    locationName: string;
    boxNumber: string;
    standNumber: string;
    startDate: string;
    startTime: string;
    unlockCode: string;
    helpUrl?: string;
    bookingsUrl?: string;
  }): Promise<EmailResult> {
    const boxStand = `Box ${params.boxNumber}, Stand ${params.standNumber}`;
    const text = `Your Unlock Code - ${params.locationName}

Your booking has started. Here is your igloo lock code:

${boxStand}
Location: ${params.locationName}
Start: ${params.startDate} at ${params.startTime}

Unlock code: ${params.unlockCode}

${params.bookingsUrl ? `View your bookings: ${params.bookingsUrl}` : ''}
Need help? ${params.helpUrl || 'https://ixtarent.com/support'}`;

    const html = `
<p><strong>Your Unlock Code</strong></p>
<p>Your booking at <strong>${params.locationName}</strong> has started. Here is your unlock code:</p>
<p><strong>${boxStand}</strong><br>Start: ${params.startDate} at ${params.startTime}</p>
<p><strong>Igloo lock code:</strong> ${params.unlockCode}</p>
${params.bookingsUrl ? `<p><a href="${params.bookingsUrl}">View your bookings</a></p>` : ''}
<p>Need help? <a href="${params.helpUrl || 'https://ixtarent.com/support'}">${params.helpUrl || 'https://ixtarent.com/support'}</a></p>`;

    return this.sendEmail({
      to: params.to,
      subject: `Your unlock code - ${params.locationName} - IXTArent`,
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

Need help? ${params.helpUrl || 'https://ixtarent.com/support'}`;

    const html = `
<p><strong>Box Return Confirmation</strong></p>
<p>Your box has been successfully returned.</p>
<p><strong>Box & Stand:</strong> ${boxStand}</p>
<p><strong>Location:</strong> ${params.locationName}</p>
<p><strong>Return Date:</strong> ${params.returnDate}</p>
<p><strong>Return Time:</strong> ${params.returnTime}</p>
<p>${params.depositReleased ? '<strong>Your deposit has been released.</strong>' : '<strong>Your deposit will be processed shortly.</strong>'}</p>
<p><strong>Return photos recorded:</strong></p>
<p>Box Front View: <a href="${params.photos.boxFrontView}">${params.photos.boxFrontView}</a></p>
<p>Box Back View: <a href="${params.photos.boxBackView}">${params.photos.boxBackView}</a></p>
<p>Closed Stand with Lock: <a href="${params.photos.closedStandLock}">${params.photos.closedStandLock}</a></p>
<p>Thank you for using IXTArent!</p>
<p>Need help? <a href="${params.helpUrl || 'https://ixtarent.com/support'}">${params.helpUrl || 'https://ixtarent.com/support'}</a></p>`;

    return this.sendEmail({
      to: params.to,
      subject: 'Box Return Confirmation - IXTArent',
      text,
      html,
    });
  }

  /**
   * Send new booking notification email to distributor (box owner)
   */
  async sendBookingNotificationToDistributor(params: {
    to: string;
    locationName: string;
    boxNumber: string;
    standNumber: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    customerName?: string;
    customerEmail?: string;
    helpUrl?: string;
    dashboardUrl?: string;
  }): Promise<EmailResult> {
    const boxStand = `Box ${params.boxNumber}, Stand ${params.standNumber}`;
    const customerLine = (params.customerName || params.customerEmail)
      ? `Customer: ${params.customerName || params.customerEmail}${params.customerEmail && params.customerName ? ` (${params.customerEmail})` : ''}`
      : '';

    const text = `New Booking at Your Location

A new booking has been confirmed:

Location: ${params.locationName}
${boxStand}
Start: ${params.startDate} at ${params.startTime}
End: ${params.endDate} at ${params.endTime}
${customerLine}

${params.dashboardUrl ? `View in dashboard: ${params.dashboardUrl}` : ''}
Need help? ${params.helpUrl || 'https://ixtarent.com/support'}`;

    const customerHtml = customerLine ? `<p><strong>Customer:</strong> ${params.customerName || params.customerEmail}${params.customerEmail && params.customerName ? ` (${params.customerEmail})` : ''}</p>` : '';

    const html = `
<p><strong>New Booking Confirmed</strong></p>
<p>A new booking has been made at your location.</p>
<p><strong>Location:</strong> ${params.locationName}</p>
<p><strong>Box & Stand:</strong> ${boxStand}</p>
<p><strong>Start:</strong> ${params.startDate} at ${params.startTime}</p>
<p><strong>End:</strong> ${params.endDate} at ${params.endTime}</p>
${customerHtml}
${params.dashboardUrl ? `<p><a href="${params.dashboardUrl}">View in dashboard</a></p>` : ''}
<p>Need help? <a href="${params.helpUrl || 'https://ixtarent.com/support'}">${params.helpUrl || 'https://ixtarent.com/support'}</a></p>`;

    return this.sendEmail({
      to: params.to,
      subject: `New Booking at ${params.locationName} - IXTArent`,
      text,
      html,
    });
  }
}
  