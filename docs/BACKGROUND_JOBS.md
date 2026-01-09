# Background Jobs System Documentation

## Overview

The ImobiBase application uses **BullMQ** with **Redis** for robust background job processing. This system handles asynchronous tasks such as sending emails, generating reports, processing payments, and more.

## Architecture

### Components

1. **Redis Client** (`server/cache/redis-client.ts`)
   - Connection management with automatic reconnection
   - Health checks and monitoring
   - Connection pooling

2. **Queue Manager** (`server/jobs/queue-manager.ts`)
   - Queue initialization and configuration
   - Worker registration
   - Job monitoring and management
   - Retry logic with exponential backoff

3. **Job Processors** (`server/jobs/processors/`)
   - Email Processor - Email sending
   - Invoice Processor - Invoice generation
   - Report Processor - Report generation
   - Payment Reminder Processor - Payment reminders
   - Backup Processor - Database backups
   - Cleanup Processor - Data cleanup
   - Notification Processor - Push notifications
   - Export Processor - LGPD data exports
   - Integration Sync Processor - External API sync

4. **Job Queues** (`server/jobs/`)
   - Email Queue - Email job management
   - Invoice Queue - Invoice job management
   - Report Queue - Report job management
   - Payment Queue - Payment reminder management

5. **Scheduled Jobs** (`server/jobs/scheduled-jobs.ts`)
   - Cron-based scheduling
   - Automatic recurring tasks

6. **Monitoring** (`server/jobs/monitoring.ts`)
   - Queue statistics
   - Performance metrics
   - Health checks

## Queue Configuration

### Queue Names

```typescript
enum QueueName {
  EMAIL = 'email',
  INVOICE = 'invoice',
  REPORT = 'report',
  PAYMENT_REMINDER = 'payment-reminder',
  BACKUP = 'backup',
  CLEANUP = 'cleanup',
  NOTIFICATION = 'notification',
  EXPORT = 'export',
  INTEGRATION_SYNC = 'integration-sync',
}
```

### Default Configuration

```typescript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000, // 5 seconds
  },
  removeOnComplete: {
    age: 24 * 3600, // 24 hours
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // 7 days
  },
}
```

### Worker Concurrency

| Queue | Concurrency | Reason |
|-------|-------------|---------|
| Email | 10 | Can send multiple emails in parallel |
| Invoice | 5 | Moderate resource usage |
| Report | 3 | Resource-intensive operations |
| Payment Reminder | 5 | Similar to invoices |
| Backup | 1 | Only one backup at a time |
| Cleanup | 2 | Low priority, moderate load |
| Notification | 10 | Lightweight operations |
| Export | 3 | Resource-intensive |
| Integration Sync | 2 | External API rate limits |

## Scheduled Jobs

### Daily Jobs

#### Payment Reminders (9:00 AM)
```typescript
cron.schedule('0 9 * * *', async () => {
  await runPaymentReminders();
});
```
- Checks for overdue payments
- Sends upcoming payment reminders
- Sends final notices

#### Daily Reports (Midnight)
```typescript
cron.schedule('0 0 * * *', async () => {
  await runDailyReports();
});
```

#### Database Backup (2:00 AM)
```typescript
cron.schedule('0 2 * * *', async () => {
  await runDatabaseBackup();
});
```

### Weekly Jobs

#### Weekly Reports (Monday 8:00 AM)
```typescript
cron.schedule('0 8 * * 1', async () => {
  await runWeeklyReports();
});
```

#### Temp Files Cleanup (Sunday 3:00 AM)
```typescript
cron.schedule('0 3 * * 0', async () => {
  await runCleanupTempFiles();
});
```

### Hourly Jobs

#### Session Cleanup
```typescript
cron.schedule('0 * * * *', async () => {
  await runCleanupSessions();
});
```

### Every 6 Hours

#### Log Cleanup
```typescript
cron.schedule('0 */6 * * *', async () => {
  await runCleanupLogs();
});
```

#### Integration Sync
```typescript
cron.schedule('0 */6 * * *', async () => {
  await runIntegrationSync();
});
```

### Monthly Jobs

#### Monthly Reports (1st day, 8:00 AM)
```typescript
cron.schedule('0 8 1 * *', async () => {
  await runMonthlyReports();
});
```

## Usage Examples

### Queueing an Email

```typescript
import { queueEmail } from './jobs/email-queue';

await queueEmail({
  to: 'user@example.com',
  subject: 'Welcome to ImobiBase',
  template: 'welcome',
  data: {
    userName: 'John Doe',
    loginUrl: 'https://app.imobibase.com/login',
  },
});
```

### Generating an Invoice

```typescript
import { queueInvoice } from './jobs/invoice-queue';

await queueInvoice({
  invoiceId: 12345,
  userId: 1,
  sendEmail: true,
});
```

### Creating a Custom Report

```typescript
import { queueCustomReport } from './jobs/report-queue';

await queueCustomReport(
  '2025-01-01',
  '2025-01-31',
  'pdf',
  'user@example.com',
  userId
);
```

### Sending Payment Reminders

```typescript
import { queueOverduePaymentReminder } from './jobs/payment-queue';

await queueOverduePaymentReminder(contractId, 5); // 5 days overdue
```

### Requesting Data Export (LGPD)

```typescript
import { createQueue, QueueName, ExportJobData } from './jobs/queue-manager';

const exportQueue = createQueue<ExportJobData>(QueueName.EXPORT);

await exportQueue.add('user-data-export', {
  userId: 123,
  type: 'all',
  format: 'zip',
  email: 'user@example.com',
});
```

## API Endpoints

All endpoints require admin authentication.

### Queue Management

#### Get Overall Statistics
```
GET /api/admin/jobs/stats
```

Response:
```json
{
  "totalQueues": 9,
  "totalWaiting": 15,
  "totalActive": 3,
  "totalCompleted": 1250,
  "totalFailed": 12,
  "totalDelayed": 0,
  "redisStatus": {
    "connected": true,
    "mode": "standalone",
    "version": "7.2.0"
  }
}
```

#### List All Queues
```
GET /api/admin/jobs/queues
```

#### Get Queue Details
```
GET /api/admin/jobs/queue/:name
```

#### Get Queue Performance
```
GET /api/admin/jobs/queue/:name/performance
```

#### Get Queue Logs
```
GET /api/admin/jobs/queue/:name/logs?limit=50
```

### Job Management

#### List Failed Jobs
```
GET /api/admin/jobs/failed?limit=100
```

#### Retry Failed Job
```
POST /api/admin/jobs/retry/:queueName/:jobId
```

#### Retry All Failed Jobs
```
POST /api/admin/jobs/retry-all/:queueName
```

#### Get Job Details
```
GET /api/admin/jobs/job/:queueName/:jobId
```

#### Remove Job
```
DELETE /api/admin/jobs/:queueName/:jobId
```

### Queue Control

#### Pause Queue
```
POST /api/admin/jobs/pause/:queueName
```

#### Resume Queue
```
POST /api/admin/jobs/resume/:queueName
```

### Cleanup

#### Clean Completed Jobs
```
POST /api/admin/jobs/clean/completed/:queueName
Body: { "olderThanHours": 24 }
```

#### Clean Failed Jobs
```
POST /api/admin/jobs/clean/failed/:queueName
Body: { "olderThanDays": 7 }
```

### Monitoring

#### Health Check
```
GET /api/admin/jobs/health
```

Response:
```json
{
  "healthy": true,
  "queues": [
    {
      "name": "email",
      "status": "healthy",
      "issues": []
    }
  ],
  "redis": {
    "status": "healthy",
    "latency": 2
  }
}
```

#### Scheduled Jobs Status
```
GET /api/admin/jobs/scheduled
```

#### Redis Information
```
GET /api/admin/jobs/redis
```

## Environment Variables

### Required

```env
# Redis connection URL
REDIS_URL=redis://localhost:6379

# Or for production with password
REDIS_URL=redis://:password@redis.example.com:6379
```

### Optional

```env
# Session secret for Redis session store
SESSION_SECRET=your-secret-key-change-in-production

# Application URL for email links
APP_URL=https://app.imobibase.com

# Email service (for production)
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=noreply@imobibase.com

# Backup bucket (for production)
BACKUP_BUCKET=backups.imobibase.com
EXPORT_BUCKET=exports.imobibase.com
```

## Redis Session Storage

Sessions are now stored in Redis instead of PostgreSQL for better performance.

### Benefits

- **Faster**: Redis is in-memory
- **Auto-expiration**: Sessions expire automatically
- **Scalable**: Easy to add Redis cluster
- **Reduced DB load**: Less queries to PostgreSQL

### Configuration

```typescript
import { createRedisSessionStore, getSessionConfig } from './session-redis';

const store = createRedisSessionStore();
const sessionConfig = getSessionConfig(store);

app.use(session(sessionConfig));
```

## Monitoring & Observability

### Sentry Integration

All job errors are automatically captured in Sentry with:
- Job ID
- Queue name
- Job data
- Attempt number
- Stack trace

### Logs

Jobs log important events:
```
[EmailProcessor] Sending email to user@example.com
[EmailProcessor] Email sent successfully to: user@example.com
[QueueManager] Queue 'email' initialized
[Worker:email] Processing job abc123
[Worker:email] Job abc123 completed successfully
```

### Health Checks

The system provides health checks for:
- Redis connection
- Queue status
- Failed job counts
- Worker status

## Performance Considerations

### Job Priority

Jobs can be prioritized (1-10, lower = higher priority):

```typescript
await queueEmail(data, {
  priority: 1, // Highest priority
});
```

### Delayed Jobs

Jobs can be scheduled for later execution:

```typescript
await queueEmail(data, {
  delay: 60000, // 1 minute delay
});
```

### Batch Processing

Use batch operations to avoid overwhelming the system:

```typescript
// Spread batch emails over time
for (const recipient of recipients) {
  await queueEmail(data, {
    priority: 5,
    delay: Math.random() * 60000, // Random delay up to 1 minute
  });
}
```

### Rate Limiting

Workers have concurrency limits to prevent:
- Memory exhaustion
- API rate limit violations
- Database connection pool exhaustion

## Error Handling

### Retry Strategy

Jobs automatically retry with exponential backoff:

1. First retry: after 5 seconds
2. Second retry: after 10 seconds
3. Third retry: after 20 seconds

After 3 failures, the job moves to the failed queue.

### Manual Retry

Failed jobs can be manually retried via API:

```bash
curl -X POST http://localhost:5000/api/admin/jobs/retry/email/job-id-123
```

## Graceful Shutdown

The system handles shutdown gracefully:

1. Stop accepting new jobs
2. Finish processing active jobs
3. Close queue connections
4. Close Redis connection

```typescript
process.on('SIGTERM', async () => {
  await shutdownJobs();
  await closeRedis();
  process.exit(0);
});
```

## Best Practices

### 1. Job Design

- Keep jobs idempotent (safe to retry)
- Don't store large data in job payload
- Use job IDs for tracking
- Log important events

### 2. Error Handling

- Catch and log errors
- Report to Sentry
- Use appropriate retry counts
- Clean up resources

### 3. Monitoring

- Set up alerts for failed jobs
- Monitor queue sizes
- Check Redis health
- Review job performance

### 4. Scaling

- Add more workers for high load
- Use Redis cluster for HA
- Monitor memory usage
- Adjust concurrency as needed

## Troubleshooting

### Jobs Not Processing

1. Check Redis connection:
```bash
curl http://localhost:5000/api/admin/jobs/redis
```

2. Check queue health:
```bash
curl http://localhost:5000/api/admin/jobs/health
```

3. Check worker status in logs

### High Failure Rate

1. Review failed jobs:
```bash
curl http://localhost:5000/api/admin/jobs/failed
```

2. Check job details for errors
3. Review Sentry for patterns
4. Adjust retry strategy if needed

### Memory Issues

1. Reduce worker concurrency
2. Clean old jobs more frequently
3. Reduce job data size
4. Monitor Redis memory usage

### Slow Processing

1. Check queue performance metrics
2. Increase worker concurrency
3. Add more workers
4. Optimize processor code

## Development

### Running Locally

1. Install Redis:
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt-get install redis-server
sudo systemctl start redis
```

2. Set environment variables:
```bash
export REDIS_URL=redis://localhost:6379
```

3. Start the server:
```bash
npm run dev
```

### Testing Jobs

Use the monitoring dashboard or API to test jobs:

```typescript
// Test email
await queueEmail({
  to: 'test@example.com',
  subject: 'Test Email',
  template: 'welcome',
  data: { userName: 'Test User' },
});
```

## Production Deployment

### Redis Setup

Use managed Redis service:
- AWS ElastiCache
- Google Cloud Memorystore
- Redis Cloud
- Azure Cache for Redis

### Configuration

```env
REDIS_URL=redis://:password@production-redis.example.com:6379
REDIS_TLS=true  # If using TLS
```

### Scaling

1. Vertical: Increase Redis instance size
2. Horizontal: Add more worker instances
3. Cluster: Use Redis cluster for HA

### Monitoring

Set up monitoring for:
- Queue depths
- Job failure rates
- Processing times
- Redis health
- Memory usage

## Support

For issues or questions:
- Check logs in `/var/log/imobibase/`
- Review Sentry error reports
- Check Redis connection
- Contact system administrator

## Changelog

### Version 1.0.0 (2025-12-24)

- Initial release
- 9 job processors
- 9 scheduled tasks
- Redis session storage
- Admin dashboard API
- Sentry integration
- Graceful shutdown
- Comprehensive monitoring
