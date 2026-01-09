# Quick Start - Email Service

## 1. Install Dependencies

```bash
npm install
```

This will install the required packages:
- @sendgrid/mail ^8.1.4
- resend ^4.0.1
- bullmq ^5.66.2
- ioredis ^5.8.2

## 2. Configure Environment Variables

Create or update your `.env` file:

```bash
# Choose your email provider (sendgrid or resend)
EMAIL_PROVIDER=sendgrid

# If using SendGrid:
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx

# If using Resend:
# RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Email sender configuration
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=ImobiBase

# Optional: Redis for email queue (recommended for production)
REDIS_URL=redis://localhost:6379
```

## 3. Get Your API Keys

### SendGrid (Recommended for high volume)
1. Sign up at https://sendgrid.com
2. Go to Settings > API Keys
3. Create a new API key with "Mail Send" permission
4. Copy the key and add to .env as SENDGRID_API_KEY

### Resend (Great for developers)
1. Sign up at https://resend.com
2. Go to API Keys
3. Create a new API key
4. Copy the key and add to .env as RESEND_API_KEY

## 4. Test the Email Service

Start your server:
```bash
npm run dev
```

Test the email configuration:
```bash
curl -X POST http://localhost:5000/api/email/test \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{"to": "your-email@example.com"}'
```

## 5. Send Your First Email

```typescript
import { getEmailService } from './server/email/email-service';

const emailService = getEmailService();

// Send a welcome email
await emailService.send({
  to: 'user@example.com',
  subject: 'Welcome to ImobiBase!',
  templateName: 'welcome',
  templateData: {
    name: 'John Doe',
    loginUrl: 'https://app.imobibase.com/login'
  },
  tenantBranding: {
    companyName: 'My Real Estate Company',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    logo: 'https://yourcompany.com/logo.png'
  }
});
```

## 6. Available Templates

Use any of these 15 templates by setting `templateName`:

- `welcome` - Welcome new users
- `password-reset` - Password reset
- `email-verification` - Email verification
- `invoice` - Payment invoice
- `payment-confirmation` - Payment confirmed
- `payment-failed` - Payment failed
- `subscription-ending` - Subscription expiring
- `lead-notification` - New lead
- `visit-reminder` - Visit reminder
- `contract-signed` - Contract signed
- `monthly-report` - Monthly report
- `low-stock-alert` - Low inventory
- `team-invitation` - Team invitation
- `property-match` - Property match
- `newsletter` - Newsletter

## 7. Common Use Cases

### Send Password Reset Email
```typescript
await emailService.send({
  to: user.email,
  subject: 'Reset Your Password',
  templateName: 'password-reset',
  templateData: {
    name: user.name,
    resetUrl: `https://app.imobibase.com/reset?token=${token}`,
    expirationTime: 24
  }
});
```

### Notify Agent of New Lead
```typescript
await emailService.send({
  to: agent.email,
  subject: 'New Lead Received!',
  templateName: 'lead-notification',
  templateData: {
    leadName: lead.name,
    leadEmail: lead.email,
    leadPhone: lead.phone,
    leadSource: 'Website',
    message: lead.message,
    receivedDate: new Date().toLocaleDateString(),
    leadUrl: `https://app.imobibase.com/leads/${lead.id}`
  }
});
```

### Send Visit Reminder
```typescript
await emailService.send({
  to: client.email,
  subject: 'Visit Reminder - Tomorrow',
  templateName: 'visit-reminder',
  templateData: {
    clientName: client.name,
    visitDate: '25/12/2025',
    visitTime: '10:00',
    dayName: 'Wednesday',
    propertyTitle: 'Beautiful 3BR Apartment',
    propertyAddress: '123 Main St, City',
    agentName: agent.name,
    agentPhone: agent.phone
  }
});
```

## 8. Email Queue (Optional but Recommended)

If you configured Redis, emails will be automatically queued for reliable delivery:

```typescript
// This email will be queued and sent in the background
await emailService.send({
  to: 'user@example.com',
  subject: 'Welcome',
  templateName: 'welcome',
  templateData: { name: 'John' },
  queue: true  // Use queue
});

// Check queue statistics
const stats = await emailService.getQueueStats();
console.log(stats);
// { waiting: 5, active: 2, completed: 100, failed: 1 }
```

## 9. Troubleshooting

### "Email service not configured"
- Check that EMAIL_PROVIDER is set in .env
- Verify the corresponding API key is set (SENDGRID_API_KEY or RESEND_API_KEY)

### "Failed to send email"
- Check your API key is correct
- Verify your sender email is verified in SendGrid/Resend
- Check application logs for detailed error messages

### "Template not found"
- Verify the template name is correct (case-sensitive)
- Check that the template file exists in /server/email/templates/

### Email not received
- Check spam/junk folder
- Verify sender email is verified in your email provider
- Check provider dashboard for delivery status
- Verify DNS records (SPF, DKIM) are configured

## 10. Next Steps

1. ✅ Configure DNS records for better deliverability (SPF, DKIM, DMARC)
2. ✅ Customize templates with your branding
3. ✅ Integrate email sending into your application flows
4. ✅ Set up Redis for email queue in production
5. ✅ Monitor email delivery using provider dashboards
6. ✅ Review full documentation in /docs/EMAIL_SETUP.md

## Need Help?

- Full Documentation: `/docs/EMAIL_SETUP.md`
- Template Examples: `/server/email/templates/`
- API Reference: See documentation for all endpoints
- Provider Docs: [SendGrid](https://docs.sendgrid.com) | [Resend](https://resend.com/docs)

---

**You're all set! Start sending beautiful emails! 🚀**
