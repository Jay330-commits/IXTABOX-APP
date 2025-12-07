# Notification Services

Simple email notification service for the IXTArent application.

## Email Service

The `EmailService` class provides simple email functionality using nodemailer with SMTP.

### Environment Variables

Add these to your `.env.local` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=developerixtarent@gmail.com
SMTP_PASSWORD=your_app_password_here
SMTP_SENDER_EMAIL=developerixtarent@gmail.com
SMTP_SENDER_NAME=IXTArent
```

**Note for Gmail:** Use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password.

### Usage

```typescript
import { EmailService } from '@/services/notifications/emailService';

const emailService = new EmailService();

// Send text email
await emailService.sendEmail({
  to: 'customer@example.com',
  subject: 'Welcome',
  text: 'Thank you for joining!'
});

// Send HTML email
await emailService.sendEmail({
  to: 'customer@example.com',
  subject: 'Welcome',
  html: '<h1>Welcome!</h1><p>Thank you for joining!</p>',
  text: 'Welcome! Thank you for joining!' // Optional fallback
});
```

### Testing

**Check SMTP Configuration:**
```bash
GET /api/notifications/test-email
```

**Send Test Email:**
```bash
POST /api/notifications/test-email
Content-Type: application/json

{
  "to": "your-email@example.com",
  "testType": "simple"  // or "html"
}
```
