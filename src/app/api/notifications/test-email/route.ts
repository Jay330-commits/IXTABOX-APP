import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/services/notifications/emailService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, testType = 'simple' } = body;

    // Validate required fields
    if (!to) {
      return NextResponse.json(
        { success: false, message: 'Email address (to) is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email address format' },
        { status: 400 }
      );
    }

    const emailService = new EmailService();

    let result;

    // Send different types of test emails based on testType
    switch (testType) {
      case 'simple':
        // Simple text email
        result = await emailService.sendEmail({
          to,
          subject: 'Test Email from IXTArent',
          text: 'This is a simple test email from the IXTArent notification service. If you received this, the email service is working correctly!',
        });
        break;

      case 'html':
        // HTML email
        result = await emailService.sendEmail({
          to,
          subject: 'Test HTML Email from IXTArent',
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background-color: #06b6d4; color: white; padding: 20px; text-align: center; border-radius: 5px; }
                  .content { background-color: #f9fafb; padding: 20px; margin-top: 10px; border-radius: 5px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Test Email</h1>
                  </div>
                  <div class="content">
                    <p>This is a test HTML email from the IXTArent notification service.</p>
                    <p>If you can see this formatted email, the HTML email functionality is working correctly!</p>
                  </div>
                </div>
              </body>
            </html>
          `,
          text: 'This is a test HTML email from the IXTArent notification service.',
        });
        break;

      default:
        return NextResponse.json(
          { success: false, message: `Unknown test type: ${testType}. Use: simple or html` },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${to}`,
        messageId: result.messageId,
        testType,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to send test email',
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Test email API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check SMTP configuration
export async function GET() {
  try {
    const emailService = new EmailService();

    // Check if SMTP configuration is present
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpPort = process.env.SMTP_PORT;
    const smtpSenderEmail = process.env.SMTP_SENDER_EMAIL;
    const smtpSenderName = process.env.SMTP_SENDER_NAME;

    const config = {
      smtpHost: smtpHost ? '✓ Set' : '✗ Missing',
      smtpPort: smtpPort || '465 (default)',
      smtpUser: smtpUser ? '✓ Set' : '✗ Missing',
      smtpPassword: smtpPassword ? '✓ Set' : '✗ Missing',
      smtpSenderEmail: smtpSenderEmail || smtpUser || '✗ Missing',
      smtpSenderName: smtpSenderName || 'IXTArent (default)',
    };

    // Check if configuration is complete
    const connectionStatus = (smtpHost && smtpUser && smtpPassword) 
      ? '✓ Configuration complete' 
      : '✗ Configuration incomplete';

    return NextResponse.json({
      success: true,
      config,
      connectionStatus,
      message: 'SMTP configuration status',
    });
  } catch (error) {
    console.error('SMTP config check error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to check SMTP configuration',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

