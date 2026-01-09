# Email Service Documentation

## Overview

The ImobiBase email service provides a complete solution for sending transactional and marketing emails with support for multiple providers (SendGrid and Resend), email queueing with BullMQ and Redis, beautiful HTML templates, and comprehensive analytics.

## Features

- ✅ **Multiple Providers**: Support for SendGrid and Resend
- ✅ **Email Queue**: Optional Redis-backed queue with BullMQ for reliable delivery
- ✅ **Template System**: 15+ beautiful, responsive HTML email templates
- ✅ **Template Rendering**: Dynamic template rendering with variables and conditionals
- ✅ **Tenant Branding**: Customizable branding per tenant (logo, colors, company info)
- ✅ **Email Utilities**: Validation, unsubscribe tokens, tracking, rate limiting
- ✅ **REST API**: Complete API for sending emails, managing templates, and monitoring
- ✅ **Error Handling**: Automatic retries and comprehensive error reporting

## Installation

### 1. Install Dependencies

```bash
npm install @sendgrid/mail resend bullmq ioredis
```

### 2. Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Email Provider (sendgrid or resend)
EMAIL_PROVIDER=sendgrid

# SendGrid Configuration (if using SendGrid)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here

# Resend Configuration (if using Resend)
RESEND_API_KEY=re_your_resend_api_key_here

# Email From Address
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=YourCompany

# Redis Configuration (optional, for email queue)
REDIS_URL=redis://localhost:6379
# OR
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

## Email Templates

The following templates are available:

1. **welcome.html** - Welcome new users
2. **password-reset.html** - Password reset link
3. **email-verification.html** - Email address verification
4. **invoice.html** - Payment invoice
5. **payment-confirmation.html** - Payment received confirmation
6. **payment-failed.html** - Payment failed notification
7. **subscription-ending.html** - Subscription expiring soon
8. **lead-notification.html** - New lead notification
9. **visit-reminder.html** - Visit appointment reminder
10. **contract-signed.html** - Contract signed notification
11. **monthly-report.html** - Monthly performance report
12. **low-stock-alert.html** - Low property inventory alert
13. **team-invitation.html** - Invite user to tenant
14. **property-match.html** - Property matches lead preferences
15. **newsletter.html** - Generic newsletter template

## API Endpoints

### Send Single Email

```http
POST /api/email/send
Content-Type: application/json
Authorization: Bearer <token>

{
  "to": "user@example.com",
  "subject": "Welcome to ImobiBase",
  "templateName": "welcome",
  "templateData": {
    "name": "John Doe",
    "loginUrl": "https://app.imobibase.com/login"
  },
  "tenantBranding": {
    "logo": "https://yourdomain.com/logo.png",
    "primaryColor": "#3B82F6",
    "secondaryColor": "#1E40AF",
    "companyName": "Your Company",
    "address": "123 Main St",
    "phone": "+1234567890",
    "email": "contact@yourcompany.com",
    "website": "https://yourcompany.com"
  },
  "queue": true,
  "priority": 1
}
```

### Send Bulk Emails

```http
POST /api/email/send-bulk
Content-Type: application/json
Authorization: Bearer <token>

{
  "emails": [
    {
      "to": "user1@example.com",
      "subject": "Newsletter",
      "templateName": "newsletter",
      "templateData": { ... }
    },
    {
      "to": "user2@example.com",
      "subject": "Newsletter",
      "templateName": "newsletter",
      "templateData": { ... }
    }
  ]
}
```

### Test Email Configuration

```http
POST /api/email/test
Content-Type: application/json
Authorization: Bearer <token>

{
  "to": "test@example.com"
}
```

### List Templates

```http
GET /api/email/templates
Authorization: Bearer <token>
```

### Preview Template

```http
POST /api/email/preview/welcome
Content-Type: application/json
Authorization: Bearer <token>

{
  "data": {
    "name": "John Doe",
    "loginUrl": "https://app.imobibase.com/login"
  },
  "branding": {
    "companyName": "Your Company",
    "primaryColor": "#3B82F6"
  }
}
```

### Get Queue Statistics

```http
GET /api/email/queue/stats
Authorization: Bearer <token>
```

### Get Email Service Status

```http
GET /api/email/status
Authorization: Bearer <token>
```

## Usage Examples

### Programmatic Usage

```typescript
import { getEmailService } from './email/email-service';

// Get the email service instance
const emailService = getEmailService();

// Send a welcome email
await emailService.send({
  to: 'user@example.com',
  subject: 'Welcome!',
  templateName: 'welcome',
  templateData: {
    name: 'John Doe',
    loginUrl: 'https://app.imobibase.com/login'
  },
  tenantBranding: {
    companyName: 'My Company',
    primaryColor: '#3B82F6'
  },
  queue: true // Use queue for reliable delivery
});

// Send a password reset email
await emailService.sendTemplate(
  'password-reset',
  'user@example.com',
  'Reset Your Password',
  {
    name: 'John Doe',
    resetUrl: 'https://app.imobibase.com/reset?token=abc123',
    expirationTime: 24
  },
  branding,
  { queue: true, priority: 10 } // High priority
);

// Send bulk emails
await emailService.sendBulk([
  {
    to: 'user1@example.com',
    subject: 'Monthly Report',
    templateName: 'monthly-report',
    templateData: { ... }
  },
  {
    to: 'user2@example.com',
    subject: 'Monthly Report',
    templateName: 'monthly-report',
    templateData: { ... }
  }
]);
```

### Integration Examples

#### User Registration

```typescript
// After user registration
await emailService.send({
  to: user.email,
  subject: 'Welcome to ImobiBase!',
  templateName: 'welcome',
  templateData: {
    name: user.name,
    loginUrl: 'https://app.imobibase.com/login'
  },
  tenantBranding: getTenantBranding(user.tenantId)
});
```

#### Password Reset

```typescript
// When user requests password reset
const resetToken = generateResetToken();

await emailService.send({
  to: user.email,
  subject: 'Reset Your Password',
  templateName: 'password-reset',
  templateData: {
    name: user.name,
    resetUrl: `https://app.imobibase.com/reset?token=${resetToken}`,
    expirationTime: 24
  },
  tenantBranding: getTenantBranding(user.tenantId),
  priority: 10 // High priority
});
```

#### Lead Notification

```typescript
// When a new lead is created
await emailService.send({
  to: agent.email,
  subject: 'New Lead Received!',
  templateName: 'lead-notification',
  templateData: {
    leadName: lead.name,
    leadEmail: lead.email,
    leadPhone: lead.phone,
    leadSource: lead.source,
    leadType: lead.type,
    message: lead.message,
    receivedDate: formatDate(lead.createdAt),
    leadUrl: `https://app.imobibase.com/leads/${lead.id}`
  },
  tenantBranding: getTenantBranding(agent.tenantId)
});
```

#### Visit Reminder

```typescript
// Send visit reminder 24 hours before
await emailService.send({
  to: visit.clientEmail,
  subject: 'Visit Reminder - Tomorrow',
  templateName: 'visit-reminder',
  templateData: {
    clientName: visit.clientName,
    visitDate: formatDate(visit.date),
    visitTime: formatTime(visit.time),
    dayName: getDayName(visit.date),
    propertyTitle: property.title,
    propertyAddress: property.address,
    propertyImage: property.images[0],
    agentName: agent.name,
    agentPhone: agent.phone,
    addToCalendarUrl: generateCalendarUrl(visit),
    mapUrl: generateMapUrl(property.address)
  },
  tenantBranding: getTenantBranding(agent.tenantId)
});
```

## Template Variables

### Common Variables

All templates support these common variables:

- `branding.logo` - Company logo URL
- `branding.primaryColor` - Primary brand color
- `branding.secondaryColor` - Secondary brand color
- `branding.companyName` - Company name
- `branding.address` - Company address
- `branding.phone` - Company phone
- `branding.email` - Company email
- `branding.website` - Company website
- `currentYear` - Current year (automatically added)
- `unsubscribeUrl` - Unsubscribe link (optional)

### Template-Specific Variables

Each template has its own required variables. Check the template HTML files in `server/email/templates/` for specific variables.

## Template Syntax

Templates use a simple variable replacement syntax:

### Simple Variables

```html
<h1>Hello, {{name}}!</h1>
<p>Your email is {{email}}</p>
```

### Nested Variables

```html
<p>{{branding.companyName}}</p>
<div style="color: {{branding.primaryColor}}">Branded content</div>
```

### Conditionals

```html
{{#if propertyImage}}
<img src="{{propertyImage}}" alt="Property">
{{/if}}

{{#if branding.logo}}
<img src="{{branding.logo}}" alt="Logo">
{{/if}}
```

### Loops

```html
{{#each items}}
<div class="item">
  <h3>{{item.title}}</h3>
  <p>{{item.description}}</p>
</div>
{{/each}}
```

## Email Queue

The email queue uses BullMQ and Redis for reliable email delivery.

### Benefits

- **Reliability**: Emails are persisted to Redis and will be retried on failure
- **Performance**: Non-blocking - API responds immediately while emails are sent in background
- **Scalability**: Can handle high email volumes
- **Monitoring**: Track queue statistics and job status
- **Retry Logic**: Automatic retries with exponential backoff

### Configuration

Email queue is automatically enabled when Redis is configured. Configure Redis using environment variables:

```bash
REDIS_URL=redis://localhost:6379
# OR
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

### Queue Statistics

Monitor queue performance:

```typescript
const stats = await emailService.getQueueStats();
console.log(stats);
// {
//   waiting: 5,
//   active: 2,
//   completed: 1000,
//   failed: 3,
//   delayed: 0
// }
```

## Provider Setup

### SendGrid Setup

1. Create a SendGrid account at https://sendgrid.com
2. Generate an API key from Settings > API Keys
3. Add the API key to your `.env` file:
   ```bash
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=SG.your_api_key_here
   ```
4. Verify your sender domain/email in SendGrid
5. Set up SPF and DKIM records for your domain

### Resend Setup

1. Create a Resend account at https://resend.com
2. Generate an API key from Settings > API Keys
3. Add the API key to your `.env` file:
   ```bash
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_your_api_key_here
   ```
4. Verify your domain in Resend
5. Set up DNS records (MX, SPF, DKIM)

## Best Practices

### Email Deliverability

1. **Verify Your Domain**: Always use a verified domain for sending emails
2. **SPF/DKIM**: Set up proper DNS records for authentication
3. **Clean Lists**: Remove bounced and invalid emails
4. **Unsubscribe**: Always include unsubscribe links in marketing emails
5. **Content**: Avoid spam trigger words, maintain good text-to-image ratio
6. **Warm Up**: Gradually increase sending volume for new domains

### Rate Limiting

SendGrid and Resend have different rate limits:

- **SendGrid**: Varies by plan (100/day on free, unlimited on paid)
- **Resend**: 100/day on free tier, 50,000/month on paid

Use the email queue to manage high volumes and respect rate limits.

### Error Handling

Always handle email sending errors:

```typescript
const result = await emailService.send({
  to: user.email,
  subject: 'Welcome',
  templateName: 'welcome',
  templateData: { name: user.name }
});

if (!result.success) {
  console.error('Failed to send email:', result.error);
  // Handle error (log, retry, notify admin, etc.)
}
```

### Testing

Test your email configuration:

```bash
curl -X POST http://localhost:5000/api/email/test \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your_session_cookie" \
  -d '{"to": "your-email@example.com"}'
```

## Troubleshooting

### Email Not Sending

1. Check environment variables are set correctly
2. Verify API key is valid
3. Check provider dashboard for errors
4. Verify sender email/domain
5. Check application logs for errors

### Email Queue Not Working

1. Verify Redis is running: `redis-cli ping`
2. Check Redis connection settings
3. Check application logs for queue errors
4. View queue stats: `GET /api/email/queue/stats`

### Template Errors

1. Verify template exists in `server/email/templates/`
2. Check template data matches template variables
3. Use preview endpoint to test templates
4. Check for syntax errors in template

### Deliverability Issues

1. Check spam folder
2. Verify SPF/DKIM records
3. Check domain reputation
4. Review email content for spam triggers
5. Check provider dashboard for blocks/bounces

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| EMAIL_PROVIDER | Yes | sendgrid | Email provider (sendgrid or resend) |
| SENDGRID_API_KEY | If using SendGrid | - | SendGrid API key |
| RESEND_API_KEY | If using Resend | - | Resend API key |
| EMAIL_FROM | Yes | noreply@imobibase.com | From email address |
| EMAIL_FROM_NAME | No | ImobiBase | From name |
| REDIS_URL | No | - | Redis connection URL |
| REDIS_HOST | No | - | Redis host |
| REDIS_PORT | No | 6379 | Redis port |
| REDIS_PASSWORD | No | - | Redis password |

## Security Considerations

1. **API Keys**: Store API keys securely in environment variables, never commit to git
2. **Validation**: Always validate email addresses before sending
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Unsubscribe**: Honor unsubscribe requests immediately
5. **Data Privacy**: Comply with GDPR/CAN-SPAM regulations
6. **Authentication**: Protect email endpoints with authentication

## Support

For issues or questions:

1. Check the logs in the application console
2. Review provider documentation (SendGrid/Resend)
3. Check Redis logs if using queue
4. Contact support team

## File Structure

```
server/
├── email/
│   ├── email-service.ts        # Main email service
│   ├── sendgrid-service.ts     # SendGrid implementation
│   ├── resend-service.ts       # Resend implementation
│   ├── email-queue.ts          # BullMQ queue implementation
│   ├── template-renderer.ts    # Template rendering engine
│   ├── utils.ts                # Email utilities
│   └── templates/              # HTML email templates
│       ├── welcome.html
│       ├── password-reset.html
│       ├── email-verification.html
│       ├── invoice.html
│       ├── payment-confirmation.html
│       ├── payment-failed.html
│       ├── subscription-ending.html
│       ├── lead-notification.html
│       ├── visit-reminder.html
│       ├── contract-signed.html
│       ├── monthly-report.html
│       ├── low-stock-alert.html
│       ├── team-invitation.html
│       ├── property-match.html
│       └── newsletter.html
├── routes-email.ts             # Email API routes
└── index.ts                    # Main application (imports email routes)
```

## License

This email service is part of ImobiBase and follows the project's license.
