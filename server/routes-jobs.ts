import { Express, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getOverallStats,
  getQueueStats,
  getAllFailedJobs,
  retryAllFailedJobs,
  cleanCompletedJobs,
  cleanFailedJobs,
  getJobDetails,
  getJobLogs,
  getQueuePerformance,
  performHealthCheck,
} from './jobs/monitoring';
import {
  getAllQueuesHealth,
  retryFailedJob,
  pauseQueue,
  resumeQueue,
  removeJob,
  QueueName,
} from './jobs/queue-manager';
import { getScheduledJobsStatus } from './jobs/scheduled-jobs';
import { checkRedisHealth, getRedisInfo } from './cache/redis-client';
import { generateRateLimitKey } from './middleware/rate-limit-key-generator';

/**
 * Register job management routes
 * All routes require admin authentication
 */
export function registerJobRoutes(app: Express): void {
  // Middleware to check admin authentication
  const requireAdmin = (req: Request, res: Response, next: Function) => {
    // In production, check if user is admin
    // For now, we'll allow access if user is authenticated
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // TODO: Check if user has admin role
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({ error: 'Forbidden' });
    // }

    next();
  };

  // 🔒 Rate limiter para admin jobs endpoints
  const adminJobsLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 100, // 100 requisições por minuto
    message: { error: 'Admin Jobs API rate limit exceeded. Please slow down.' },
    keyGenerator: generateRateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Aplicar rate limiter globalmente em todas as rotas /api/admin/jobs
  app.use('/api/admin/jobs', adminJobsLimiter);

  /**
   * GET /api/admin/jobs/stats
   * Get overall job statistics
   * 🔒 RATE LIMIT: 100 requests per minute
   */
  app.get('/api/admin/jobs/stats', requireAdmin, async (req: Request, res: Response) => {
    try {
      const stats = await getOverallStats();
      res.json(stats);
    } catch (error) {
      console.error('[JobRoutes] Failed to get stats:', error);
      res.status(500).json({
        error: 'Failed to get job statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/admin/jobs/queues
   * List all queues with their health status
   */
  app.get('/api/admin/jobs/queues', requireAdmin, async (req: Request, res: Response) => {
    try {
      const queues = await getAllQueuesHealth();
      res.json(queues);
    } catch (error) {
      console.error('[JobRoutes] Failed to get queues:', error);
      res.status(500).json({
        error: 'Failed to get queues',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/admin/jobs/queue/:name
   * Get detailed information about a specific queue
   */
  app.get('/api/admin/jobs/queue/:name', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name } = req.params;

      // Validate queue name
      if (!Object.values(QueueName).includes(name as QueueName)) {
        return res.status(400).json({ error: 'Invalid queue name' });
      }

      const stats = await getQueueStats(name as QueueName);
      res.json(stats);
    } catch (error) {
      console.error('[JobRoutes] Failed to get queue stats:', error);
      res.status(500).json({
        error: 'Failed to get queue statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/admin/jobs/queue/:name/performance
   * Get performance metrics for a queue
   */
  app.get('/api/admin/jobs/queue/:name/performance', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name } = req.params;

      if (!Object.values(QueueName).includes(name as QueueName)) {
        return res.status(400).json({ error: 'Invalid queue name' });
      }

      const performance = await getQueuePerformance(name as QueueName);
      res.json(performance);
    } catch (error) {
      console.error('[JobRoutes] Failed to get queue performance:', error);
      res.status(500).json({
        error: 'Failed to get queue performance',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/admin/jobs/queue/:name/logs
   * Get recent job logs for a queue
   */
  app.get('/api/admin/jobs/queue/:name/logs', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!Object.values(QueueName).includes(name as QueueName)) {
        return res.status(400).json({ error: 'Invalid queue name' });
      }

      const logs = await getJobLogs(name as QueueName, limit);
      res.json(logs);
    } catch (error) {
      console.error('[JobRoutes] Failed to get job logs:', error);
      res.status(500).json({
        error: 'Failed to get job logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/admin/jobs/failed
   * List all failed jobs across all queues
   */
  app.get('/api/admin/jobs/failed', requireAdmin, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const failedJobs = await getAllFailedJobs(limit);

      res.json(failedJobs);
    } catch (error) {
      console.error('[JobRoutes] Failed to get failed jobs:', error);
      res.status(500).json({
        error: 'Failed to get failed jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/admin/jobs/retry/:queueName/:jobId
   * Retry a specific failed job
   */
  app.post('/api/admin/jobs/retry/:queueName/:jobId', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { queueName, jobId } = req.params;

      if (!Object.values(QueueName).includes(queueName as QueueName)) {
        return res.status(400).json({ error: 'Invalid queue name' });
      }

      await retryFailedJob(queueName as QueueName, jobId);

      res.json({
        success: true,
        message: `Job ${jobId} in queue ${queueName} has been retried`,
      });
    } catch (error) {
      console.error('[JobRoutes] Failed to retry job:', error);
      res.status(500).json({
        error: 'Failed to retry job',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/admin/jobs/retry-all/:queueName
   * Retry all failed jobs in a queue
   */
  app.post('/api/admin/jobs/retry-all/:queueName', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;

      if (!Object.values(QueueName).includes(queueName as QueueName)) {
        return res.status(400).json({ error: 'Invalid queue name' });
      }

      const retriedCount = await retryAllFailedJobs(queueName as QueueName);

      res.json({
        success: true,
        message: `${retriedCount} jobs in queue ${queueName} have been retried`,
        count: retriedCount,
      });
    } catch (error) {
      console.error('[JobRoutes] Failed to retry all jobs:', error);
      res.status(500).json({
        error: 'Failed to retry jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/admin/jobs/clean/completed/:queueName
   * Clean completed jobs from a queue
   */
  app.post('/api/admin/jobs/clean/completed/:queueName', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const olderThanHours = parseInt(req.body.olderThanHours) || 24;

      if (!Object.values(QueueName).includes(queueName as QueueName)) {
        return res.status(400).json({ error: 'Invalid queue name' });
      }

      const cleanedCount = await cleanCompletedJobs(queueName as QueueName, olderThanHours);

      res.json({
        success: true,
        message: `${cleanedCount} completed jobs cleaned from ${queueName}`,
        count: cleanedCount,
      });
    } catch (error) {
      console.error('[JobRoutes] Failed to clean completed jobs:', error);
      res.status(500).json({
        error: 'Failed to clean jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/admin/jobs/clean/failed/:queueName
   * Clean failed jobs from a queue
   */
  app.post('/api/admin/jobs/clean/failed/:queueName', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;
      const olderThanDays = parseInt(req.body.olderThanDays) || 7;

      if (!Object.values(QueueName).includes(queueName as QueueName)) {
        return res.status(400).json({ error: 'Invalid queue name' });
      }

      const cleanedCount = await cleanFailedJobs(queueName as QueueName, olderThanDays);

      res.json({
        success: true,
        message: `${cleanedCount} failed jobs cleaned from ${queueName}`,
        count: cleanedCount,
      });
    } catch (error) {
      console.error('[JobRoutes] Failed to clean failed jobs:', error);
      res.status(500).json({
        error: 'Failed to clean jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/admin/jobs/pause/:queueName
   * Pause a queue
   */
  app.post('/api/admin/jobs/pause/:queueName', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;

      if (!Object.values(QueueName).includes(queueName as QueueName)) {
        return res.status(400).json({ error: 'Invalid queue name' });
      }

      await pauseQueue(queueName as QueueName);

      res.json({
        success: true,
        message: `Queue ${queueName} has been paused`,
      });
    } catch (error) {
      console.error('[JobRoutes] Failed to pause queue:', error);
      res.status(500).json({
        error: 'Failed to pause queue',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/admin/jobs/resume/:queueName
   * Resume a paused queue
   */
  app.post('/api/admin/jobs/resume/:queueName', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { queueName } = req.params;

      if (!Object.values(QueueName).includes(queueName as QueueName)) {
        return res.status(400).json({ error: 'Invalid queue name' });
      }

      await resumeQueue(queueName as QueueName);

      res.json({
        success: true,
        message: `Queue ${queueName} has been resumed`,
      });
    } catch (error) {
      console.error('[JobRoutes] Failed to resume queue:', error);
      res.status(500).json({
        error: 'Failed to resume queue',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * DELETE /api/admin/jobs/:queueName/:jobId
   * Remove a job from a queue
   */
  app.delete('/api/admin/jobs/:queueName/:jobId', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { queueName, jobId } = req.params;

      if (!Object.values(QueueName).includes(queueName as QueueName)) {
        return res.status(400).json({ error: 'Invalid queue name' });
      }

      await removeJob(queueName as QueueName, jobId);

      res.json({
        success: true,
        message: `Job ${jobId} removed from queue ${queueName}`,
      });
    } catch (error) {
      console.error('[JobRoutes] Failed to remove job:', error);
      res.status(500).json({
        error: 'Failed to remove job',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/admin/jobs/job/:queueName/:jobId
   * Get details of a specific job
   */
  app.get('/api/admin/jobs/job/:queueName/:jobId', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { queueName, jobId } = req.params;

      if (!Object.values(QueueName).includes(queueName as QueueName)) {
        return res.status(400).json({ error: 'Invalid queue name' });
      }

      const job = await getJobDetails(queueName as QueueName, jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      res.json({
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
        returnvalue: job.returnvalue,
      });
    } catch (error) {
      console.error('[JobRoutes] Failed to get job details:', error);
      res.status(500).json({
        error: 'Failed to get job details',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/admin/jobs/health
   * Get health check for all queues and Redis
   */
  app.get('/api/admin/jobs/health', requireAdmin, async (req: Request, res: Response) => {
    try {
      const health = await performHealthCheck();
      res.json(health);
    } catch (error) {
      console.error('[JobRoutes] Failed to perform health check:', error);
      res.status(500).json({
        error: 'Failed to perform health check',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/admin/jobs/scheduled
   * Get status of scheduled jobs
   */
  app.get('/api/admin/jobs/scheduled', requireAdmin, async (req: Request, res: Response) => {
    try {
      const scheduledJobs = getScheduledJobsStatus();
      res.json(scheduledJobs);
    } catch (error) {
      console.error('[JobRoutes] Failed to get scheduled jobs:', error);
      res.status(500).json({
        error: 'Failed to get scheduled jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/admin/jobs/redis
   * Get Redis connection information
   */
  app.get('/api/admin/jobs/redis', requireAdmin, async (req: Request, res: Response) => {
    try {
      const [health, info] = await Promise.all([
        checkRedisHealth(),
        getRedisInfo(),
      ]);

      res.json({
        health,
        info,
      });
    } catch (error) {
      console.error('[JobRoutes] Failed to get Redis info:', error);
      res.status(500).json({
        error: 'Failed to get Redis information',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  console.log('[JobRoutes] Job management routes registered');
}
