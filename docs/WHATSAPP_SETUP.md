# WhatsApp Business API Integration - Setup Guide

Complete documentation for ImobiBase's WhatsApp Business API integration.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Configuration](#configuration)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Templates](#templates)
7. [Auto-Responder](#auto-responder)
8. [Message Queue](#message-queue)
9. [Webhooks](#webhooks)
10. [Client Integration](#client-integration)
11. [Rate Limiting](#rate-limiting)
12. [Troubleshooting](#troubleshooting)

## Overview

This integration provides complete WhatsApp Business API functionality for the ImobiBase CRM, including:

- Send/receive text, media, and template messages
- Conversation management with threading
- Auto-responder with business hours and keyword detection
- Message queue with rate limiting (80 msgs/second)
- Template management with variable replacement
- Lead capture from WhatsApp conversations
- Staff chat widget for managing conversations
- Webhook handling for real-time updates

## Prerequisites

### 1. WhatsApp Business Account

You need a WhatsApp Business Account set up through Meta's Business Platform:

1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Create or select a Business Account
3. Set up WhatsApp Business API access
4. Get your credentials:
   - `WHATSAPP_API_TOKEN`: Access token for API
   - `WHATSAPP_PHONE_NUMBER_ID`: Phone number ID
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`: Business Account ID

### 2. Environment Variables

Add to your `.env` file:

```env
# WhatsApp Business API
WHATSAPP_API_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=000000000000000
WHATSAPP_BUSINESS_ACCOUNT_ID=000000000000000
WHATSAPP_VERIFY_TOKEN=your_custom_verify_token_here
```

### 3. Database Migration

Run database migration to create WhatsApp tables:

```bash
npm run db:push
```

This creates the following tables:
- `whatsapp_templates`
- `whatsapp_conversations`
- `whatsapp_messages`
- `whatsapp_message_queue`
- `whatsapp_auto_responses`

## Configuration

### Initialize Default Templates

When a new tenant is created, initialize default templates:

```typescript
import { templateManager } from "./server/integrations/whatsapp/template-manager";

await templateManager.initializeDefaultTemplates(tenantId);
```

### Initialize Auto-Responses

Set up default auto-responses:

```typescript
import { autoResponder } from "./server/integrations/whatsapp/auto-responder";

await autoResponder.initializeDefaultAutoResponses(tenantId);
```

## Database Schema

### whatsapp_templates

Stores WhatsApp message templates:

```sql
- id: UUID (primary key)
- tenant_id: UUID (foreign key to tenants)
- name: TEXT (template identifier)
- category: TEXT (leads, properties, visits, contracts, payments)
- language: TEXT (default: pt_BR)
- status: TEXT (pending, approved, rejected)
- body_text: TEXT (template message)
- footer_text: TEXT (optional footer)
- variables: TEXT[] (variable names)
- usage_count: INTEGER
- created_at, updated_at: TIMESTAMP
```

### whatsapp_conversations

Tracks conversations with contacts:

```sql
- id: UUID (primary key)
- tenant_id: UUID
- lead_id: UUID (optional, links to leads table)
- phone_number: TEXT
- contact_name: TEXT
- status: TEXT (active, waiting, closed)
- assigned_to: UUID (user ID)
- last_message_at: TIMESTAMP
- unread_count: INTEGER
- metadata: JSONB
- created_at, updated_at: TIMESTAMP
```

### whatsapp_messages

Stores all messages (inbound/outbound):

```sql
- id: UUID (primary key)
- tenant_id: UUID
- conversation_id: UUID
- waba_message_id: TEXT (WhatsApp API message ID)
- direction: TEXT (inbound, outbound)
- message_type: TEXT (text, image, document, etc.)
- content: TEXT
- media_url: TEXT
- status: TEXT (pending, sent, delivered, read, failed)
- sent_at, delivered_at, read_at: TIMESTAMP
- created_at: TIMESTAMP
```

### whatsapp_message_queue

Queue for message sending:

```sql
- id: UUID (primary key)
- tenant_id: UUID
- phone_number: TEXT
- message_type: TEXT
- content: TEXT
- priority: INTEGER (1-10, higher = more urgent)
- status: TEXT (pending, processing, sent, failed)
- retry_count: INTEGER
- scheduled_for: TIMESTAMP (optional)
- created_at: TIMESTAMP
```

### whatsapp_auto_responses

Auto-response configurations:

```sql
- id: UUID (primary key)
- tenant_id: UUID
- name: TEXT
- trigger_type: TEXT (keyword, business_hours, first_contact, all_messages)
- keywords: TEXT[] (for keyword triggers)
- response_text: TEXT
- is_active: BOOLEAN
- priority: INTEGER
- business_hours_only: BOOLEAN
- created_at, updated_at: TIMESTAMP
```

## API Endpoints

### Messages

#### Send Text Message

```http
POST /api/whatsapp/send
Content-Type: application/json

{
  "phoneNumber": "5511999999999",
  "message": "Hello from ImobiBase!",
  "priority": 5
}
```

#### Send Template Message

```http
POST /api/whatsapp/send-template
Content-Type: application/json

{
  "phoneNumber": "5511999999999",
  "templateId": "template-uuid",
  "variables": {
    "nome": "João Silva",
    "imovel": "Apartamento Centro",
    "data": "10/01/2025"
  },
  "priority": 7
}
```

#### Send Media Message

```http
POST /api/whatsapp/send-media
Content-Type: application/json

{
  "phoneNumber": "5511999999999",
  "mediaUrl": "https://example.com/image.jpg",
  "caption": "Check out this property!",
  "priority": 5
}
```

### Templates

#### List Templates

```http
GET /api/whatsapp/templates?category=leads
```

#### Create Template

```http
POST /api/whatsapp/templates
Content-Type: application/json

{
  "name": "my_template",
  "category": "leads",
  "bodyText": "Hello {{nome}}, welcome to {{empresa}}!",
  "variables": ["nome", "empresa"]
}
```

#### Update Template

```http
PUT /api/whatsapp/templates/:id
Content-Type: application/json

{
  "bodyText": "Updated message text"
}
```

#### Delete Template

```http
DELETE /api/whatsapp/templates/:id
```

#### Get Template Stats

```http
GET /api/whatsapp/templates-stats
```

### Conversations

#### List Conversations

```http
GET /api/whatsapp/conversations?status=active&limit=50&offset=0
```

#### Get Conversation with Messages

```http
GET /api/whatsapp/conversation/:id?limit=100
```

#### Mark Conversation as Read

```http
POST /api/whatsapp/conversation/:id/read
```

#### Assign Conversation to User

```http
POST /api/whatsapp/conversation/:id/assign
Content-Type: application/json

{
  "userId": "user-uuid"
}
```

#### Close Conversation

```http
POST /api/whatsapp/conversation/:id/close
```

#### Get Conversation Stats

```http
GET /api/whatsapp/conversations-stats
```

### Auto-Responses

#### List Auto-Responses

```http
GET /api/whatsapp/auto-responses
```

#### Create Auto-Response

```http
POST /api/whatsapp/auto-responses
Content-Type: application/json

{
  "name": "After Hours Response",
  "triggerType": "business_hours",
  "responseText": "We're currently closed. We'll respond during business hours.",
  "isActive": true,
  "priority": 10,
  "businessHoursOnly": false
}
```

#### Update Auto-Response

```http
PUT /api/whatsapp/auto-responses/:id
Content-Type: application/json

{
  "isActive": false
}
```

#### Delete Auto-Response

```http
DELETE /api/whatsapp/auto-responses/:id
```

### Webhooks

#### Webhook Endpoint

```http
POST /api/webhooks/whatsapp
X-Hub-Signature-256: sha256=...

{
  "object": "whatsapp_business_account",
  "entry": [...]
}
```

#### Webhook Verification

```http
GET /api/webhooks/whatsapp/verify?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
```

### Queue

#### Get Queue Stats

```http
GET /api/whatsapp/queue/stats
```

### Configuration

#### Get Config Status

```http
GET /api/whatsapp/config/status
```

## Templates

### Pre-configured Templates

The system includes 10 pre-configured templates:

1. **welcome_message** - Welcome new leads
2. **visit_reminder** - Visit appointment reminder
3. **visit_confirmation** - Confirm visit scheduling
4. **property_match** - Property matches preferences
5. **payment_reminder** - Payment due reminder
6. **payment_received** - Payment confirmation
7. **contract_ready** - Contract ready to sign
8. **document_request** - Request documents
9. **follow_up** - Follow-up message
10. **property_new_listing** - New property alert

### Template Variables

Available variables for templates:

- `{{nome}}` - Contact name
- `{{email}}` - Contact email
- `{{telefone}}` - Contact phone
- `{{imovel}}` - Property title
- `{{valor}}` - Property value
- `{{endereco}}` - Property address
- `{{data}}` - Date
- `{{hora}}` - Time
- `{{corretor}}` - Agent name
- `{{empresa}}` - Company name
- `{{link}}` - URL link
- `{{quartos}}` - Number of bedrooms
- `{{cidade}}` - City

### Creating Custom Templates

```typescript
const template = await templateManager.createTemplate({
  tenantId: "tenant-uuid",
  name: "custom_template",
  category: "properties",
  bodyText: "Hello {{nome}}, check out this {{imovel}} in {{cidade}} for {{valor}}!",
  variables: ["nome", "imovel", "cidade", "valor"],
  footerText: "ImobiBase - Your property partner",
});
```

## Auto-Responder

### Trigger Types

1. **keyword** - Matches specific keywords in messages
2. **business_hours** - Triggers outside business hours
3. **first_contact** - Triggers on first message
4. **all_messages** - Triggers on every message

### Default Auto-Responses

1. **After Hours** - Responds when outside business hours
2. **First Contact** - Welcomes new contacts
3. **Info Keyword** - Responds to "informação", "info", "detalhes"
4. **Visit Keyword** - Responds to "visita", "agendar"
5. **Price Keyword** - Responds to "preço", "valor"

### Business Hours Configuration

Configure in `tenant_settings.business_hours`:

```json
{
  "enabled": true,
  "monday": { "start": "09:00", "end": "18:00", "closed": false },
  "tuesday": { "start": "09:00", "end": "18:00", "closed": false },
  "wednesday": { "start": "09:00", "end": "18:00", "closed": false },
  "thursday": { "start": "09:00", "end": "18:00", "closed": false },
  "friday": { "start": "09:00", "end": "18:00", "closed": false },
  "saturday": { "start": "09:00", "end": "13:00", "closed": false },
  "sunday": { "start": "00:00", "end": "00:00", "closed": true },
  "timezone": "America/Sao_Paulo"
}
```

## Message Queue

### Features

- **Rate Limiting**: Respects WhatsApp's 80 messages/second limit
- **Priority System**: 1-10 scale (higher = more urgent)
- **Retry Logic**: Automatic retry with exponential backoff
- **Scheduled Messages**: Send messages at specific times
- **Bulk Sending**: Queue multiple messages at once

### Priority Levels

- **10**: Critical (immediate)
- **8-9**: High priority (auto-responses)
- **5-7**: Normal (regular messages)
- **3-4**: Low (bulk messages)
- **1-2**: Very low (scheduled campaigns)

### Processing

Queue processor runs every 5 seconds, processing up to 50 messages per batch with rate limiting to ensure ~20 msg/s (conservative vs 80 msg/s limit).

### Retry Strategy

- **Max Retries**: 3 attempts
- **Backoff**: 2^n seconds (2s, 4s, 8s)
- **Failures**: Logged with error messages

## Webhooks

### Setup in Meta Business Platform

1. Go to your WhatsApp Business App settings
2. Configure Webhooks:
   - **Callback URL**: `https://your-domain.com/api/webhooks/whatsapp`
   - **Verify Token**: Value from `WHATSAPP_VERIFY_TOKEN` env var
3. Subscribe to webhooks:
   - `messages` - Incoming messages
   - `message_status` - Delivery status updates

### Webhook Events Handled

1. **Incoming Messages**
   - Text messages
   - Media messages (image, document, video, audio)
   - Location messages
   - Contact cards
   - Interactive responses (buttons, lists)

2. **Status Updates**
   - Sent
   - Delivered
   - Read
   - Failed (with error details)

### Security

Webhooks are verified using `X-Hub-Signature-256` header with HMAC SHA256.

## Client Integration

### Chat Widget

Add to your React app:

```tsx
import { ChatWidget } from "@/components/whatsapp-chat/ChatWidget";

function WhatsAppPage() {
  return (
    <div className="container mx-auto py-6">
      <ChatWidget />
    </div>
  );
}
```

### Features

- **Conversation List**: View all conversations with unread counts
- **Message Thread**: Real-time message display with status indicators
- **Template Selector**: Quick access to message templates
- **Search & Filter**: Find conversations by name/phone, filter by status
- **Auto-Refresh**: Polls for new messages every 3-5 seconds
- **Status Indicators**: Sent (✓), Delivered (✓✓), Read (✓✓ blue)

## Rate Limiting

### WhatsApp Official Limits

- **80 messages/second** per phone number
- **1000 business-initiated conversations per 24 hours** (varies by tier)
- **Messaging window**: 24 hours after last customer message

### Implementation

Our queue system implements conservative rate limiting:

- **20 messages/second** (25% of limit for safety)
- **50ms delay** between messages
- **Queue batching**: 50 messages per batch
- **Automatic retry**: Failed messages retry with backoff

### Best Practices

1. Use templates for business-initiated messages
2. Respond to customer messages within 24-hour window
3. Monitor queue stats regularly
4. Set appropriate priorities for different message types
5. Schedule bulk messages during off-peak hours

## Troubleshooting

### Common Issues

#### 1. Messages Not Sending

**Problem**: Messages stuck in "pending" status

**Solutions**:
- Check `WHATSAPP_API_TOKEN` is valid
- Verify `WHATSAPP_PHONE_NUMBER_ID` is correct
- Check queue stats: `GET /api/whatsapp/queue/stats`
- Review server logs for API errors

#### 2. Webhooks Not Receiving

**Problem**: No incoming messages in database

**Solutions**:
- Verify webhook URL is publicly accessible
- Check `WHATSAPP_VERIFY_TOKEN` matches Meta settings
- Review webhook verification logs
- Test webhook manually with Meta's test tool

#### 3. Auto-Responder Not Triggering

**Problem**: No automatic responses

**Solutions**:
- Check auto-response is active: `GET /api/whatsapp/auto-responses`
- Verify trigger conditions (keywords, business hours)
- Check priority conflicts (higher priority responses block lower)
- Review auto-responder logs

#### 4. Template Variables Not Replacing

**Problem**: Variables showing as `{{variable}}` in messages

**Solutions**:
- Ensure variables object contains all required fields
- Check variable names match exactly (case-sensitive)
- Validate template before sending
- Review template configuration

### Logging

Enable detailed WhatsApp logging:

```typescript
import { log } from "./server/index";

// All WhatsApp operations log with source "whatsapp"
// Check logs for entries like: [whatsapp] Message sent successfully
```

### Database Queries

Check message status:

```sql
-- Recent messages
SELECT * FROM whatsapp_messages
ORDER BY created_at DESC
LIMIT 50;

-- Failed messages
SELECT * FROM whatsapp_messages
WHERE status = 'failed';

-- Queue status
SELECT status, COUNT(*)
FROM whatsapp_message_queue
GROUP BY status;

-- Conversation stats
SELECT status, COUNT(*)
FROM whatsapp_conversations
GROUP BY status;
```

## Support

For issues:
1. Check logs: `[whatsapp]` entries
2. Review database: Failed messages, queue status
3. Test API: Use Postman/curl for endpoints
4. Meta Dashboard: Check phone number status, template approvals
5. Rate Limits: Monitor usage in Meta Business Platform

## API Version

Currently using WhatsApp Business API **v18.0**

Update in `business-api.ts` if needed:

```typescript
apiVersion: "v18.0"  // Change to latest version
```

---

**Documentation Version**: 1.0.0
**Last Updated**: 2024-12-24
**Author**: Agent 5 - WhatsApp Business API Engineer
