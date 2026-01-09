# Payment System Documentation

## Overview

The ImobiBase payment system provides complete integration with **Stripe** (global payments) and **Mercado Pago** (Brazil), including subscription management, plan enforcement, invoice generation, and webhook handling.

## Table of Contents

1. [Architecture](#architecture)
2. [Environment Variables](#environment-variables)
3. [Stripe Integration](#stripe-integration)
4. [Mercado Pago Integration](#mercado-pago-integration)
5. [Plan Enforcement](#plan-enforcement)
6. [Invoice Generation](#invoice-generation)
7. [API Endpoints](#api-endpoints)
8. [Webhook Setup](#webhook-setup)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Architecture

### Directory Structure

```
server/
├── payments/
│   ├── stripe/
│   │   ├── stripe-service.ts       # Core Stripe operations
│   │   ├── stripe-webhooks.ts      # Webhook handlers
│   │   └── stripe-types.ts         # TypeScript types
│   ├── mercadopago/
│   │   ├── mercadopago-service.ts  # Core Mercado Pago operations
│   │   └── mercadopago-webhooks.ts # Webhook handlers
│   └── invoice-generator.ts        # PDF invoice generation
├── middleware/
│   └── plan-limits.ts              # Plan enforcement middleware
└── routes-payments.ts              # Payment API routes
```

### Database Schema

The payment system uses the following tables:

- **plans**: Subscription plans with limits and features
- **tenant_subscriptions**: Links tenants to plans with status and metadata
- **usage_logs**: Tracks tenant usage for analytics

---

## Environment Variables

Add these variables to your `.env` file:

### Stripe Configuration

```bash
# Stripe API Keys (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_... # Get from webhook settings

# Optional: Stripe Price IDs for different plans
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

### Mercado Pago Configuration

```bash
# Mercado Pago Access Token (get from https://www.mercadopago.com.br/developers)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...

# Webhook URL (your server URL + /api/webhooks/mercadopago)
MERCADOPAGO_WEBHOOK_URL=https://yourdomain.com/api/webhooks/mercadopago

# Optional: Webhook secret for signature verification
MERCADOPAGO_WEBHOOK_SECRET=your-secret-key
```

### Email Configuration (for invoices)

```bash
# SMTP settings for sending invoices
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

---

## Stripe Integration

### Features

- ✅ Customer creation and management
- ✅ Subscription lifecycle (create, update, cancel)
- ✅ Payment method management
- ✅ Invoice generation and retrieval
- ✅ Webhook event processing
- ✅ Trial period support

### Creating a Subscription

```typescript
// Client-side: Create subscription
const response = await fetch('/api/payments/stripe/create-subscription', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    priceId: 'price_xxx', // Stripe Price ID
    paymentMethodId: 'pm_xxx', // Payment method from Stripe Elements
    trialDays: 14, // Optional trial period
  }),
});

const { subscriptionId, clientSecret } = await response.json();
```

### Canceling a Subscription

```typescript
await fetch('/api/payments/stripe/cancel-subscription', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subscriptionId: 'sub_xxx',
    immediate: false, // Cancel at period end
  }),
});
```

### Webhook Events Handled

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.trial_will_end`

---

## Mercado Pago Integration

### Features

- ✅ PIX payment generation with QR Code
- ✅ Boleto bancário generation
- ✅ Credit card processing
- ✅ Payment status checking
- ✅ Webhook event processing

### Creating a PIX Payment

```typescript
const response = await fetch('/api/payments/mercadopago/create-pix', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 99.90,
    description: 'Monthly Subscription - Pro Plan',
    cpfCnpj: '12345678900', // Customer CPF or CNPJ
  }),
});

const { id, qrCode, qrCodeBase64 } = await response.json();
// Display QR code to customer
```

### Creating a Boleto Payment

```typescript
const response = await fetch('/api/payments/mercadopago/create-boleto', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 99.90,
    description: 'Monthly Subscription - Pro Plan',
    cpfCnpj: '12345678900',
    firstName: 'João',
    lastName: 'Silva',
  }),
});

const { id, boletoUrl } = await response.json();
// Redirect customer to boleto URL
```

### Checking Payment Status

```typescript
const response = await fetch(`/api/payments/mercadopago/status/${paymentId}`);
const { status, statusDetail } = await response.json();

// status can be: 'pending', 'approved', 'rejected', 'in_process', etc.
```

---

## Plan Enforcement

The plan enforcement middleware automatically checks limits before allowing resource creation.

### Middleware Functions

```typescript
import {
  checkUserLimit,
  checkPropertyLimit,
  checkIntegrationLimit,
  checkFeatureAccess,
} from './middleware/plan-limits';

// Apply to routes
app.post('/api/users', checkUserLimit, async (req, res) => {
  // Create user only if limit not reached
});

app.post('/api/properties', checkPropertyLimit, async (req, res) => {
  // Create property only if limit not reached
});

// Check feature access
app.post('/api/integrations/whatsapp',
  checkFeatureAccess('whatsapp_integration'),
  async (req, res) => {
    // Only if plan includes this feature
  }
);
```

### Response When Limit Reached

```json
{
  "error": "Property limit reached",
  "limitReached": true,
  "currentUsage": 100,
  "maxAllowed": 100,
  "planName": "Pro",
  "upgradeMessage": "You have reached the maximum number of properties (100) for your plan. Please upgrade to add more properties."
}
```

### Getting Usage Statistics

```typescript
import { getUsageStats } from './middleware/plan-limits';

const stats = await getUsageStats(tenantId);
console.log(stats);
// {
//   users: { current: 5, max: 10 },
//   properties: { current: 45, max: 100 },
//   integrations: { current: 2, max: 5 },
//   status: 'active'
// }
```

---

## Invoice Generation

The invoice generator creates professional PDF invoices and can send them via email.

### Generating an Invoice

```typescript
import { InvoiceGenerator } from './payments/invoice-generator';

// From subscription payment
const invoicePdf = await InvoiceGenerator.createInvoiceFromSubscription(
  tenantId,
  'Pro Plan',
  99.90,
  'BRL',
  'paid'
);

// Send via email
await InvoiceGenerator.sendInvoiceEmail(
  'customer@example.com',
  'Customer Name',
  invoicePdf,
  'INV-ABC123'
);
```

### Custom Invoice

```typescript
const invoiceData = {
  invoiceNumber: 'INV-2024-001',
  invoiceDate: new Date(),
  dueDate: new Date('2024-12-31'),
  tenantId: 'tenant-id',
  tenantName: 'Company Name',
  tenantEmail: 'company@example.com',
  items: [
    {
      description: 'Pro Plan - Monthly',
      quantity: 1,
      unitPrice: 99.90,
      total: 99.90,
    },
  ],
  subtotal: 99.90,
  total: 99.90,
  currency: 'BRL',
  paymentStatus: 'paid',
};

const pdf = InvoiceGenerator.generatePDF(invoiceData);
```

---

## API Endpoints

### Stripe Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/stripe/create-subscription` | Create new subscription |
| POST | `/api/payments/stripe/cancel-subscription` | Cancel subscription |
| POST | `/api/payments/stripe/update-payment-method` | Update payment method |
| GET | `/api/payments/subscription-status` | Get subscription status |
| GET | `/api/payments/invoices` | List customer invoices |
| POST | `/api/webhooks/stripe` | Stripe webhook handler |

### Mercado Pago Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/mercadopago/create-pix` | Create PIX payment |
| POST | `/api/payments/mercadopago/create-boleto` | Create Boleto payment |
| GET | `/api/payments/mercadopago/status/:paymentId` | Get payment status |
| POST | `/api/webhooks/mercadopago` | Mercado Pago webhook handler |
| GET | `/api/webhooks/mercadopago/ipn` | Legacy IPN handler |

---

## Webhook Setup

### Stripe Webhook Setup

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Mercado Pago Webhook Setup

1. Go to [Mercado Pago Developers > Webhooks](https://www.mercadopago.com.br/developers/panel/webhooks)
2. Click "Create webhook"
3. Enter your webhook URL: `https://yourdomain.com/api/webhooks/mercadopago`
4. Select events: `payment`, `subscription_preapproval`
5. Save the webhook secret to `MERCADOPAGO_WEBHOOK_SECRET`

### Testing Webhooks Locally

Use ngrok or similar tool to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 5000

# Use the ngrok URL for webhook configuration
# Example: https://abc123.ngrok.io/api/webhooks/stripe
```

---

## Testing

### Install Dependencies

```bash
npm install stripe mercadopago jspdf
npm install -D @types/node
```

### Test Stripe Integration

```bash
# Use Stripe CLI for testing
stripe listen --forward-to localhost:5000/api/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
```

### Test Mercado Pago Integration

Use the Mercado Pago test cards:
- **Approved**: 5031 4332 1540 6351
- **Rejected**: 5031 4332 1540 6351 (with specific CVV)

### Manual Testing Checklist

- [ ] Create subscription via Stripe
- [ ] Update payment method
- [ ] Cancel subscription
- [ ] Process webhook events
- [ ] Create PIX payment
- [ ] Create Boleto payment
- [ ] Check payment status
- [ ] Test plan limits enforcement
- [ ] Generate PDF invoice
- [ ] Send invoice email

---

## Troubleshooting

### Stripe Issues

**Error: "No such customer"**
- Ensure customer is created before subscription
- Check `stripeCustomerId` in tenant metadata

**Webhook signature verification failed**
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Ensure raw body is available (check express middleware)

### Mercado Pago Issues

**PIX QR Code not generated**
- Verify `MERCADOPAGO_ACCESS_TOKEN` is valid
- Check API response for error details

**Payment status not updating**
- Verify webhook URL is accessible
- Check webhook logs in Mercado Pago dashboard

### Plan Enforcement Issues

**Limits not enforced**
- Ensure middleware is applied to routes
- Check database for correct plan limits
- Verify tenant subscription status

### Invoice Generation Issues

**PDF generation fails**
- Ensure jsPDF is installed: `npm install jspdf`
- Check for sufficient memory/disk space

**Email not sent**
- Configure SMTP settings in `.env`
- Implement email service (SendGrid, AWS SES, etc.)

---

## Security Best Practices

1. **Never expose API keys in client code**
   - Keep all secrets server-side
   - Use environment variables

2. **Verify webhook signatures**
   - Always verify Stripe webhook signatures
   - Validate Mercado Pago webhook headers

3. **Implement rate limiting**
   - Protect payment endpoints from abuse
   - Use the existing rate limiter middleware

4. **Log all payment events**
   - Use Sentry for error tracking
   - Store important events in database

5. **Test in sandbox/test mode first**
   - Use Stripe test keys initially
   - Use Mercado Pago test credentials

---

## Support

For issues or questions:
- Stripe: https://support.stripe.com
- Mercado Pago: https://www.mercadopago.com.br/developers/pt/support
- ImobiBase: Create an issue in the repository

---

## License

This payment system is part of ImobiBase and follows the same license.
