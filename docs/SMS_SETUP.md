# SMS Service - Twilio Integration Documentation

## Overview

Complete SMS service implementation for ImobiBase using Twilio. This system provides SMS messaging, 2FA authentication, automated reminders, and comprehensive analytics.

## Table of Contents

1. [Features](#features)
2. [Setup & Configuration](#setup--configuration)
3. [Architecture](#architecture)
4. [Usage Examples](#usage-examples)
5. [API Reference](#api-reference)
6. [Templates](#templates)
7. [Compliance & Legal](#compliance--legal)
8. [Cost Optimization](#cost-optimization)
9. [Troubleshooting](#troubleshooting)

---

## Features

### Core Capabilities

- **SMS Sending**: Single and bulk SMS messaging
- **MMS Support**: Send messages with media attachments
- **2FA Integration**: Two-factor authentication via SMS
- **Smart Queue**: Rate-limited message queue with retry logic
- **Phone Validation**: Validate and format phone numbers (international)
- **Opt-out Management**: TCPA/GDPR compliant opt-out handling
- **Analytics**: Comprehensive delivery and cost tracking
- **Templates**: 20+ pre-built SMS templates in Portuguese
- **Webhooks**: Delivery status and incoming message handling

### Integration Points

- Visit reminders (24 hours before appointments)
- Payment reminders (3 days before due date)
- Contract notifications (ready to sign)
- Lead assignments
- Property alerts
- Urgent notifications
- Welcome messages
- Password reset

---

## Setup & Configuration

### 1. Environment Variables

Add to your `.env` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+5511999999999

# Webhook URL (for status callbacks)
TWILIO_STATUS_CALLBACK_URL=https://yourdomain.com/api/sms/webhooks/twilio/status
```

### 2. Get Twilio Credentials

1. Sign up at [twilio.com](https://www.twilio.com)
2. Get your Account SID and Auth Token from the dashboard
3. Purchase a phone number with SMS capabilities
4. Enable SMS for your account

### 3. Database Setup

Run the SQL schema to create required tables:

```bash
psql $DATABASE_URL -f db/schema-sms.sql
```

Tables created:
- `sms_queue` - Message queue
- `sms_logs` - Message history and analytics
- `sms_opt_outs` - Opt-out/opt-in management
- `verification_codes` - 2FA codes

### 4. Install Dependencies

```bash
npm install twilio libphonenumber-js
```

### 5. Register Routes

In your `server/index.ts`:

```typescript
import smsRoutes from './routes-sms';

// After other routes
app.use('/api/sms', smsRoutes);
```

### 6. Setup Webhooks

Configure Twilio webhooks in your Twilio console:

**Message Status Callback:**
- URL: `https://yourdomain.com/api/sms/webhooks/twilio/status`
- Method: POST

**Incoming Messages:**
- URL: `https://yourdomain.com/api/sms/webhooks/twilio/incoming`
- Method: POST

### 7. Setup Queue Processor (Cron Job)

Add to your cron jobs or background worker:

```typescript
import { getSMSQueue } from './integrations/sms/sms-queue';

// Run every minute
setInterval(async () => {
  const queue = getSMSQueue();
  await queue.processQueue();
}, 60000);
```

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     SMS Service Architecture                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Routes     │───→│  SMS Queue   │───→│   Twilio     │  │
│  │  (API)       │    │  (Rate Limit)│    │   Service    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         ↓                    ↓                    ↓          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Templates   │    │  Opt-out     │    │  Analytics   │  │
│  │  (Render)    │    │  Manager     │    │  (Tracking)  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         ↓                    ↓                    ↓          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Database (PostgreSQL)                    │  │
│  │  - sms_queue  - sms_logs  - sms_opt_outs            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
server/
├── integrations/sms/
│   ├── twilio-service.ts        # Twilio API wrapper
│   ├── sms-queue.ts              # Message queue & rate limiting
│   ├── templates.ts              # SMS templates
│   ├── phone-validator.ts        # Phone number validation
│   ├── twofa.ts                  # 2FA implementation
│   ├── optout.ts                 # Opt-out management
│   ├── analytics.ts              # Analytics & reporting
│   └── integration-helpers.ts    # Integration functions
├── routes-sms.ts                 # API routes
└── ...

db/
└── schema-sms.sql                # Database schema

docs/
└── SMS_SETUP.md                  # This file
```

---

## Usage Examples

### Basic SMS Sending

```typescript
import { getSMSQueue } from './integrations/sms/sms-queue';

const smsQueue = getSMSQueue();

await smsQueue.enqueue({
  to: '+5511999999999',
  body: 'Hello from ImobiBase!',
  priority: 'normal',
  maxRetries: 3,
});
```

### Using Templates

```typescript
import { renderSMSTemplate } from './integrations/sms/templates';
import { getSMSQueue } from './integrations/sms/sms-queue';

const smsQueue = getSMSQueue();

const body = renderSMSTemplate('visit_reminder', {
  propertyAddress: 'Av. Paulista, 1000',
  dateTime: '15/12/2024 às 14:00',
  agentName: 'João Silva',
});

await smsQueue.enqueue({
  to: '+5511999999999',
  body,
  templateName: 'visit_reminder',
  priority: 'high',
  maxRetries: 3,
});
```

### 2FA Authentication

```typescript
import { getTwoFactorSMS } from './integrations/sms/twofa';

const twofa = getTwoFactorSMS();

// Send verification code
const result = await twofa.generateAndSend('+5511999999999', {
  userId: 123,
  purpose: 'login_verification',
  expiryMinutes: 5,
});

// Verify code
const isValid = await twofa.verify({
  phoneNumber: '+5511999999999',
  code: '123456',
  purpose: 'login_verification',
});
```

### Bulk SMS

```typescript
import { getSMSQueue } from './integrations/sms/sms-queue';

const smsQueue = getSMSQueue();

await smsQueue.enqueueBulk({
  recipients: ['+5511111111111', '+5522222222222', '+5533333333333'],
  template: 'property_alert',
  context: {
    propertyType: 'Apartamento',
    location: 'São Paulo',
    price: '500000',
    detailsUrl: 'https://imobibase.com/property/123',
  },
});
```

### Integration Helpers

```typescript
import {
  sendVisitReminder,
  sendPaymentReminder,
  sendContractReady,
} from './integrations/sms/integration-helpers';

// Send visit reminder
await sendVisitReminder('+5511999999999', {
  propertyAddress: 'Rua das Flores, 100',
  dateTime: '15/12/2024 às 14:00',
  agentName: 'Maria Santos',
});

// Send payment reminder
await sendPaymentReminder('+5511999999999', {
  amount: 1500.00,
  dueDate: '20/12/2024',
  description: 'Aluguel Dezembro',
});

// Send contract ready notification
await sendContractReady('+5511999999999', {
  contractType: 'Contrato de Locação',
  signUrl: 'https://imobibase.com/sign/abc123',
});
```

---

## API Reference

### Endpoints

#### Send SMS
```http
POST /api/sms/send
Content-Type: application/json

{
  "to": "+5511999999999",
  "body": "Hello!",
  "priority": "normal",
  "scheduledFor": "2024-12-25T10:00:00Z"
}
```

#### Send Bulk SMS
```http
POST /api/sms/send-bulk
Content-Type: application/json

{
  "recipients": ["+5511111111111", "+5522222222222"],
  "templateName": "property_alert",
  "templateContext": {
    "propertyType": "Apartamento",
    "location": "São Paulo",
    "price": "500000",
    "detailsUrl": "https://..."
  }
}
```

#### Send 2FA Code
```http
POST /api/sms/2fa/send
Content-Type: application/json

{
  "phoneNumber": "+5511999999999",
  "userId": 123,
  "purpose": "verification"
}
```

#### Verify 2FA Code
```http
POST /api/sms/2fa/verify
Content-Type: application/json

{
  "phoneNumber": "+5511999999999",
  "code": "123456",
  "purpose": "verification"
}
```

#### Get Usage Statistics
```http
GET /api/sms/usage?startDate=2024-12-01&endDate=2024-12-31
```

#### Get Account Balance
```http
GET /api/sms/balance
```

#### Get Analytics Dashboard
```http
GET /api/sms/analytics/dashboard
```

#### Validate Phone Number
```http
POST /api/sms/validate
Content-Type: application/json

{
  "phoneNumber": "+5511999999999"
}
```

---

## Templates

### Available Templates

1. **verification_code** - 2FA/verification code
2. **password_reset** - Password reset code
3. **welcome_message** - Welcome new user
4. **visit_reminder** - Visit appointment reminder
5. **visit_confirmation** - Visit confirmation
6. **visit_cancelled** - Visit cancellation
7. **payment_reminder** - Payment due reminder
8. **payment_overdue** - Overdue payment notice
9. **payment_received** - Payment confirmation
10. **payment_failed** - Failed payment notification
11. **contract_ready** - Contract ready to sign
12. **contract_signed** - Contract signed confirmation
13. **document_uploaded** - New document notification
14. **property_alert** - New property matching preferences
15. **property_price_change** - Property price change
16. **property_status_change** - Property status change
17. **lead_assigned** - Lead assignment to agent
18. **lead_followup** - Lead follow-up reminder
19. **low_balance** - Low account balance
20. **subscription_expiring** - Subscription expiring
21. **urgent_notification** - Urgent alerts
22. **commission_paid** - Commission payment

### Template Usage

```typescript
import { renderSMSTemplate } from './integrations/sms/templates';

const message = renderSMSTemplate('payment_reminder', {
  amount: '1500.00',
  dueDate: '20/12/2024',
  description: 'Aluguel Dezembro',
});

// Output:
// "ImobiBase: Lembrete de pagamento de R$ 1500.00 vence em 20/12/2024.
//  Ref: Aluguel Dezembro. Evite multas!"
```

---

## Compliance & Legal

### TCPA Compliance (US)

- ✅ Maintain opt-out list indefinitely
- ✅ Honor STOP requests immediately
- ✅ Include opt-out instructions in first message
- ✅ Don't charge for STOP messages
- ✅ Track consent

### GDPR Compliance (EU/Brazil - LGPD)

- ✅ Obtain explicit consent before sending
- ✅ Provide easy opt-out mechanism
- ✅ Store consent records
- ✅ Right to be forgotten (delete data on request)
- ✅ Transparent data usage

### Opt-out Keywords

The system automatically handles:
- **Opt-out**: STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, PARAR, CANCELAR, SAIR
- **Opt-in**: START, YES, UNSTOP, SUBSCRIBE, SIM, COMECAR, INICIAR

### Best Practices

1. Always check opt-out status before sending
2. Include "Responda STOP para cancelar" in marketing messages
3. Send messages only during business hours (8 AM - 9 PM)
4. Don't send more than 1 message per day per recipient (marketing)
5. Keep messages concise (under 160 characters when possible)
6. Always identify your business name in the message

---

## Cost Optimization

### Strategies

#### 1. Message Length Optimization

- **1 segment** = 160 characters (1 SMS)
- **2+ segments** = 153 characters per segment

**Cost Impact:**
- 161 characters = 2 SMS = 2x cost
- Keep messages under 160 characters to save 50%

```typescript
import { calculateSMSSegments } from './integrations/sms/templates';

const message = "Your very long message...";
const segments = calculateSMSSegments(message);
console.log(`This message will cost ${segments} SMS credits`);
```

#### 2. Use Templates

Pre-optimized templates are designed to be concise:

```typescript
// BAD - 180 characters (2 segments)
const longMessage = "Olá! Seu pagamento de aluguel no valor de R$ 1500,00 vence no dia 20/12/2024. Por favor, não se esqueça de realizar o pagamento para evitar multas e juros.";

// GOOD - 156 characters (1 segment)
const shortMessage = renderSMSTemplate('payment_reminder', {
  amount: '1500.00',
  dueDate: '20/12/2024',
  description: 'Aluguel',
});
```

#### 3. Batch Sending

Use bulk send for multiple recipients:

```typescript
// More efficient - single API call
await smsQueue.enqueueBulk({
  recipients: [...],
  template: 'property_alert',
  context: {...},
});
```

#### 4. Rate Limiting

Default: 60 messages/minute (configurable)

```typescript
const smsQueue = new SMSQueue({
  rateLimit: 60, // messages per minute
  batchSize: 10,
  retryDelay: 5000,
});
```

#### 5. Smart Retry Logic

- Exponential backoff for retries
- Maximum 3 retries by default
- Failed messages don't keep retrying forever

### Cost Estimates

**Twilio Pricing (approximate):**
- Brazil (SMS): $0.0075 per segment
- US (SMS): $0.0079 per segment
- International: $0.05 - $0.30 per segment

**Monthly Cost Calculator:**

```typescript
import { getSMSAnalytics } from './integrations/sms/analytics';

const analytics = getSMSAnalytics();
const usage = await analytics.getCurrentMonthUsage();

console.log(`Monthly cost: $${usage.totalCost}`);
console.log(`Messages sent: ${usage.totalMessages}`);
console.log(`Average cost per message: $${usage.averageCostPerMessage}`);
```

**Example Costs:**
- 1,000 messages/month @ 1 segment = $7.50
- 5,000 messages/month @ 1 segment = $37.50
- 10,000 messages/month @ 1.5 segments = $112.50

---

## Troubleshooting

### Common Issues

#### 1. SMS Not Sending

**Check:**
```bash
# Verify credentials
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN
echo $TWILIO_PHONE_NUMBER

# Check queue
curl http://localhost:5000/api/sms/queue/stats

# Check logs
tail -f logs/sms.log
```

#### 2. Invalid Phone Number

```typescript
import { getPhoneValidator } from './integrations/sms/phone-validator';

const validator = getPhoneValidator();
const result = await validator.validate('+5511999999999');

if (!result.valid) {
  console.log(`Invalid: ${result.error}`);
}
```

#### 3. Messages Stuck in Queue

```typescript
import { getSMSQueue } from './integrations/sms/sms-queue';

const queue = getSMSQueue();

// Manually process queue
await queue.processQueue();

// Check stats
const stats = await queue.getStats();
console.log(stats);
```

#### 4. High Delivery Failure Rate

```typescript
import { getSMSAnalytics } from './integrations/sms/analytics';

const analytics = getSMSAnalytics();
const failures = await analytics.getFailureAnalysis({
  startDate: new Date('2024-12-01'),
  endDate: new Date('2024-12-31'),
});

console.log(failures);
```

**Common Error Codes:**
- **21211**: Invalid phone number
- **21408**: Permission denied (from number not verified)
- **21610**: Unsubscribed/blocked
- **30003**: Unreachable destination
- **30005**: Unknown destination
- **30006**: Landline or unreachable carrier

#### 5. Webhook Not Working

**Test webhook:**
```bash
curl -X POST http://localhost:5000/api/sms/webhooks/twilio/status \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=SM123&MessageStatus=delivered&To=+5511999999999"
```

**Check Twilio webhook configuration:**
1. Go to Twilio Console → Phone Numbers
2. Select your number
3. Scroll to Messaging → Webhook URL
4. Verify URL is correct and accessible

---

## Maintenance

### Scheduled Tasks

#### 1. Queue Processor (Every 1 minute)
```typescript
setInterval(async () => {
  await getSMSQueue().processQueue();
}, 60000);
```

#### 2. Cleanup Old Logs (Daily)
```typescript
// Clean logs older than 90 days
setInterval(async () => {
  await getSMSAnalytics().cleanupOldLogs(90);
  await getSMSQueue().cleanup(30);
  await getTwoFactorSMS().cleanup();
}, 86400000); // 24 hours
```

#### 3. Send Scheduled Reminders (Daily)
```typescript
import { scheduleVisitReminders, schedulePaymentReminders } from './integrations/sms/integration-helpers';

setInterval(async () => {
  await scheduleVisitReminders();
  await schedulePaymentReminders();
}, 86400000);
```

### Monitoring

**Key Metrics to Monitor:**
- Delivery rate (should be > 95%)
- Average cost per message
- Queue size (should stay low)
- Failed messages count
- Opt-out rate

```typescript
const analytics = getSMSAnalytics();
const dashboard = await analytics.getDashboardData();

if (dashboard.delivery.deliveryRate < 95) {
  console.warn('Low delivery rate!', dashboard.delivery);
}

if (dashboard.cost.averageCostPerMessage > 0.015) {
  console.warn('High cost per message!', dashboard.cost);
}
```

---

## Support

For issues or questions:
1. Check this documentation
2. Review Twilio documentation: https://www.twilio.com/docs/sms
3. Check error logs: `tail -f logs/sms.log`
4. Contact support with error details

---

## Version History

**v1.0.0** - December 2024
- Initial release
- Complete Twilio integration
- 20+ SMS templates
- 2FA support
- Analytics dashboard
- Opt-out management
- Queue system with rate limiting
