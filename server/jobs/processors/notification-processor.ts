import { Job } from 'bullmq';
import { NotificationJobData } from '../queue-manager';
import * as Sentry from '@sentry/node';

/**
 * Notification processor - handles push notifications
 */
export async function processNotification(job: Job<NotificationJobData>): Promise<void> {
  const { userId, title, message, type, actionUrl, data } = job.data;

  try {
    const userIds = Array.isArray(userId) ? userId : [userId];
    console.log(`[NotificationProcessor] Sending notification to ${userIds.length} user(s)`);

    await job.updateProgress(10);

    // Step 1: Get user notification preferences
    // In production, fetch from database
    const userPreferences = userIds.map((id) => ({
      userId: id,
      email: `user${id}@example.com`,
      pushEnabled: true,
      emailEnabled: true,
      pushTokens: [`token-${id}`],
    }));

    console.log(`[NotificationProcessor] User preferences loaded`);
    await job.updateProgress(30);

    // Step 2: Send push notifications
    let pushSent = 0;
    for (const pref of userPreferences) {
      if (pref.pushEnabled && pref.pushTokens.length > 0) {
        console.log(`[NotificationProcessor] Sending push to user ${pref.userId}`);

        // In production, use Firebase Cloud Messaging, OneSignal, etc.
        /*
        import admin from 'firebase-admin';

        const payload = {
          notification: {
            title,
            body: message,
          },
          data: {
            type,
            actionUrl: actionUrl || '',
            ...data,
          },
        };

        await admin.messaging().sendToDevice(pref.pushTokens, payload);
        */

        // Simulate delay in production, skip in tests for performance
        if (process.env.NODE_ENV !== 'test') {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        pushSent++;
      }
    }

    console.log(`[NotificationProcessor] Push notifications sent: ${pushSent}`);
    await job.updateProgress(70);

    // Step 3: Store notification in database for in-app notifications
    console.log(`[NotificationProcessor] Storing notifications in database`);

    // In production, insert into notifications table
    /*
    import { db } from '../../db';
    import { notifications } from '../../db/schema';

    for (const uid of userIds) {
      await db.insert(notifications).values({
        userId: uid,
        title,
        message,
        type,
        actionUrl,
        data: JSON.stringify(data || {}),
        read: false,
        createdAt: new Date(),
      });
    }
    */

    // Simulate delay in production, skip in tests for performance
    if (process.env.NODE_ENV !== 'test') {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    await job.updateProgress(90);

    // Step 4: Send via WebSocket for real-time updates
    console.log(`[NotificationProcessor] Broadcasting via WebSocket`);

    // In production, broadcast to connected WebSocket clients
    /*
    import { broadcastToUser } from '../../websocket';

    for (const uid of userIds) {
      broadcastToUser(uid, {
        type: 'notification',
        data: {
          title,
          message,
          type,
          actionUrl,
          data,
        },
      });
    }
    */

    await job.updateProgress(100);

    console.log(`[NotificationProcessor] Notification processing completed`);

    Sentry.addBreadcrumb({
      category: 'notification',
      message: `Notification sent: ${title}`,
      level: 'info',
      data: {
        userCount: userIds.length,
        type,
      },
    });
  } catch (error) {
    console.error(`[NotificationProcessor] Failed to send notification:`, error);

    Sentry.captureException(error, {
      tags: {
        component: 'notification-processor',
        notificationType: type,
      },
      extra: {
        userId,
        title,
      },
    });

    throw error;
  }
}
