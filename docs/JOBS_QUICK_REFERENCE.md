# Background Jobs - Quick Reference

## Common Operations

### Queue an Email

```typescript
import { queueEmail } from './jobs/email-queue';

await queueEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  template: 'welcome',
  data: { userName: 'John' },
});
```

### Generate an Invoice

```typescript
import { queueInvoice } from './jobs/invoice-queue';

await queueInvoice({
  invoiceId: 123,
  userId: 1,
  sendEmail: true,
});
```

### Create a Report

```typescript
import { queueCustomReport } from './jobs/report-queue';

await queueCustomReport(
  '2025-01-01',
  '2025-01-31',
  'pdf',
  'user@example.com'
);
```

### Send Payment Reminder

```typescript
import { queueOverduePaymentReminder } from './jobs/payment-queue';

await queueOverduePaymentReminder(contractId, 5);
```

### Request Data Export (LGPD)

```typescript
import { createQueue, QueueName } from './jobs/queue-manager';

const queue = createQueue(QueueName.EXPORT);
await queue.add('export', {
  userId: 123,
  type: 'all',
  format: 'zip',
  email: 'user@example.com',
});
```

---

## Monitoring APIs

```bash
# Overall stats
curl http://localhost:5000/api/admin/jobs/stats

# List queues
curl http://localhost:5000/api/admin/jobs/queues

# Queue details
curl http://localhost:5000/api/admin/jobs/queue/email

# Failed jobs
curl http://localhost:5000/api/admin/jobs/failed

# Health check
curl http://localhost:5000/api/admin/jobs/health
```

---

## Management Operations

```bash
# Retry failed job
curl -X POST http://localhost:5000/api/admin/jobs/retry/email/job-123

# Pause queue
curl -X POST http://localhost:5000/api/admin/jobs/pause/email

# Resume queue
curl -X POST http://localhost:5000/api/admin/jobs/resume/email

# Clean old jobs
curl -X POST http://localhost:5000/api/admin/jobs/clean/completed/email \
  -H "Content-Type: application/json" \
  -d '{"olderThanHours": 24}'
```

---

## Environment Setup

```env
# Required
REDIS_URL=redis://localhost:6379

# Optional
SESSION_SECRET=your-secret-key
SENDGRID_API_KEY=your-key
APP_URL=https://app.imobibase.com
```

---

## Queue Status

| Queue | Purpose | Concurrency |
|-------|---------|-------------|
| email | Send emails | 10 |
| invoice | Generate invoices | 5 |
| report | Generate reports | 3 |
| payment-reminder | Payment notices | 5 |
| backup | DB backups | 1 |
| cleanup | Data cleanup | 2 |
| notification | Push notifications | 10 |
| export | LGPD exports | 3 |
| integration-sync | API sync | 2 |

---

## Scheduled Jobs

| Time | Job | Frequency |
|------|-----|-----------|
| 02:00 | Database Backup | Daily |
| 09:00 | Payment Reminders | Daily |
| 00:00 | Daily Reports | Daily |
| Mon 08:00 | Weekly Reports | Weekly |
| 1st 08:00 | Monthly Reports | Monthly |
| Hourly | Session Cleanup | Hourly |
| Every 6h | Log Cleanup | 6 hours |
| Every 6h | Integration Sync | 6 hours |
| Sun 03:00 | Temp Files Cleanup | Weekly |

---

## Troubleshooting

### Jobs not processing?

```bash
# Check Redis
curl http://localhost:5000/api/admin/jobs/redis

# Check queue health
curl http://localhost:5000/api/admin/jobs/health

# Check logs
tail -f /var/log/imobibase/jobs.log
```

### High failure rate?

```bash
# List failed jobs
curl http://localhost:5000/api/admin/jobs/failed

# Get job details
curl http://localhost:5000/api/admin/jobs/job/email/job-123

# Retry all failed
curl -X POST http://localhost:5000/api/admin/jobs/retry-all/email
```

---

## Quick Links

- **Full Documentation**: `/docs/BACKGROUND_JOBS.md`
- **Implementation Report**: `/AGENT_3_BACKGROUND_JOBS_REPORT.md`
- **Code Location**: `/server/jobs/`

---

**Last Updated**: December 24, 2025
