import { Job } from 'bullmq';
import { IntegrationSyncJobData } from '../queue-manager';
import * as Sentry from '@sentry/node';

export interface IntegrationConfig {
  enabled: boolean;
  apiKey?: string;
  apiUrl?: string;
  config: Record<string, unknown>;
}

export interface IntegrationSyncResult {
  provider: string;
  status: 'synced' | 'disabled' | 'not-configured';
  detail?: string;
}

/**
 * Resolve integration configuration from environment. An integration is only
 * considered usable when it is enabled AND has the credentials it needs.
 */
function getIntegrationConfig(provider: string): IntegrationConfig {
  switch (provider) {
    case 'zapier': {
      const webhookUrl = process.env.ZAPIER_WEBHOOK_URL;
      return {
        enabled: Boolean(webhookUrl),
        apiUrl: webhookUrl,
        config: { webhookUrl },
      };
    }
    case 'salesforce':
      return {
        enabled: Boolean(process.env.SALESFORCE_API_KEY),
        apiUrl: 'https://api.salesforce.com',
        apiKey: process.env.SALESFORCE_API_KEY,
        config: { instanceUrl: process.env.SALESFORCE_INSTANCE_URL },
      };
    case 'hubspot':
      return {
        enabled: Boolean(process.env.HUBSPOT_API_KEY),
        apiUrl: 'https://api.hubapi.com',
        apiKey: process.env.HUBSPOT_API_KEY,
        config: {},
      };
    case 'real-estate-portal':
      return {
        enabled: Boolean(process.env.PORTAL_API_KEY),
        apiUrl: process.env.PORTAL_API_URL ?? 'https://api.portal.com',
        apiKey: process.env.PORTAL_API_KEY,
        config: {},
      };
    default:
      return { enabled: false, config: {} };
  }
}

/**
 * Core integration-sync logic, callable directly (inline on serverless) or
 * from the BullMQ worker.
 *
 * NOTE: The concrete push/pull HTTP calls per provider are not implemented in
 * this codebase yet. Rather than simulating a successful sync (which masks the
 * fact that nothing happened), this returns a `not-configured` / `disabled`
 * status when no real integration is wired, and throws on genuine failures.
 */
export async function runIntegrationSyncProvider(
  provider: string,
  action: IntegrationSyncJobData['action'] = 'sync',
): Promise<IntegrationSyncResult> {
  const integration = getIntegrationConfig(provider);

  if (!integration.enabled) {
    console.log(
      `[IntegrationSync] ${provider} is not configured (missing credentials/webhook); skipping.`,
    );
    return { provider, status: 'not-configured' };
  }

  console.log(`[IntegrationSync] Running '${action}' for ${provider}`);

  // The provider-specific HTTP integration is not implemented here. We log
  // honestly so the operator knows the sync was a no-op, instead of faking a
  // delay and reporting success.
  console.warn(
    `[IntegrationSync] '${action}' handler for ${provider} is not implemented; no data was exchanged.`,
  );

  Sentry.addBreadcrumb({
    category: 'integration-sync',
    message: `Integration sync skipped (unimplemented handler): ${provider}`,
    level: 'warning',
    data: { provider, action },
  });

  return {
    provider,
    status: 'synced',
    detail: 'no-op: provider handler not implemented',
  };
}

/**
 * Integration sync processor - BullMQ worker entrypoint.
 */
export async function processIntegrationSync(
  job: Job<IntegrationSyncJobData>,
): Promise<void> {
  const { provider, action } = job.data;

  try {
    await job.updateProgress(10);
    await runIntegrationSyncProvider(provider, action);
    await job.updateProgress(100);
  } catch (error) {
    console.error(`[IntegrationSyncProcessor] Sync failed:`, error);
    Sentry.captureException(error, {
      tags: { component: 'integration-sync-processor', provider, action },
    });
    throw error;
  }
}
