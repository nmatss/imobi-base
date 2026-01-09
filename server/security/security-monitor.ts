/**
 * Security Monitoring & Event Logging Module
 * Tracks security events, generates metrics, and sends alerts
 */

import type { Request } from 'express';
import * as Sentry from '@sentry/node';
import { nanoid } from 'nanoid';

// Security event types
export enum SecurityEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_COMPLETE = 'password_reset_complete',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',

  // Authorization events
  PERMISSION_DENIED = 'permission_denied',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  ROLE_CHANGE = 'role_change',

  // Attack detection
  BRUTE_FORCE_DETECTED = 'brute_force_detected',
  CREDENTIAL_STUFFING = 'credential_stuffing',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  PATH_TRAVERSAL_ATTEMPT = 'path_traversal_attempt',
  CSRF_VIOLATION = 'csrf_violation',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  IP_BLOCKED = 'ip_blocked',
  IP_UNBLOCKED = 'ip_unblocked',

  // Data access
  SENSITIVE_DATA_ACCESS = 'sensitive_data_access',
  DATA_EXPORT = 'data_export',
  DATA_DELETION = 'data_deletion',
  BULK_OPERATION = 'bulk_operation',

  // System events
  CONFIGURATION_CHANGE = 'configuration_change',
  SECURITY_SETTING_CHANGE = 'security_setting_change',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',

  // File operations
  FILE_UPLOAD = 'file_upload',
  FILE_UPLOAD_REJECTED = 'file_upload_rejected',
  SUSPICIOUS_FILE = 'suspicious_file',

  // Integration events
  WEBHOOK_FAILURE = 'webhook_failure',
  API_ERROR = 'api_error',
  INTEGRATION_ERROR = 'integration_error',
}

// Severity levels
export enum SecurityEventSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Security event interface
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  userId?: string;
  tenantId?: string;
  path?: string;
  method?: string;
  message: string;
  metadata?: Record<string, any>;
}

// In-memory event store (in production, use database or dedicated logging service)
const securityEvents: SecurityEvent[] = [];
const MAX_EVENTS_IN_MEMORY = 10000;

// Event counters for metrics
const eventCounters = new Map<SecurityEventType, number>();
const hourlyCounters = new Map<string, Map<SecurityEventType, number>>();

/**
 * Extract relevant information from request
 */
function extractRequestInfo(req?: Request): Partial<SecurityEvent> {
  if (!req) {
    return {};
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim()
    : req.ip || req.socket.remoteAddress || 'unknown';

  return {
    ip,
    userAgent: req.headers['user-agent'],
    userId: (req.user as any)?.id,
    tenantId: (req.user as any)?.tenantId,
    path: req.path,
    method: req.method,
  };
}

/**
 * Determine event severity based on type
 */
function getEventSeverity(type: SecurityEventType): SecurityEventSeverity {
  const criticalEvents = [
    SecurityEventType.BRUTE_FORCE_DETECTED,
    SecurityEventType.CREDENTIAL_STUFFING,
    SecurityEventType.SQL_INJECTION_ATTEMPT,
    SecurityEventType.XSS_ATTEMPT,
  ];

  const highEvents = [
    SecurityEventType.ACCOUNT_LOCKED,
    SecurityEventType.UNAUTHORIZED_ACCESS,
    SecurityEventType.PATH_TRAVERSAL_ATTEMPT,
    SecurityEventType.CSRF_VIOLATION,
    SecurityEventType.SUSPICIOUS_FILE,
    SecurityEventType.DATA_DELETION,
  ];

  const mediumEvents = [
    SecurityEventType.LOGIN_FAILURE,
    SecurityEventType.PERMISSION_DENIED,
    SecurityEventType.RATE_LIMIT_EXCEEDED,
    SecurityEventType.FILE_UPLOAD_REJECTED,
    SecurityEventType.PASSWORD_RESET_REQUEST,
  ];

  if (criticalEvents.includes(type)) {
    return SecurityEventSeverity.CRITICAL;
  }
  if (highEvents.includes(type)) {
    return SecurityEventSeverity.HIGH;
  }
  if (mediumEvents.includes(type)) {
    return SecurityEventSeverity.MEDIUM;
  }
  return SecurityEventSeverity.LOW;
}

/**
 * Log security event
 */
export function logSecurityEvent(
  type: SecurityEventType,
  message: string,
  req?: Request,
  metadata?: Record<string, any>
): SecurityEvent {
  const event: SecurityEvent = {
    id: nanoid(),
    type,
    severity: getEventSeverity(type),
    timestamp: new Date(),
    message,
    ...extractRequestInfo(req),
    metadata,
  };

  // Add to in-memory store
  securityEvents.push(event);

  // Limit memory usage
  if (securityEvents.length > MAX_EVENTS_IN_MEMORY) {
    securityEvents.shift();
  }

  // Update counters
  eventCounters.set(type, (eventCounters.get(type) || 0) + 1);

  // Update hourly counters
  const hour = new Date().toISOString().substring(0, 13); // YYYY-MM-DDTHH
  let hourlyMap = hourlyCounters.get(hour);
  if (!hourlyMap) {
    hourlyMap = new Map();
    hourlyCounters.set(hour, hourlyMap);
  }
  hourlyMap.set(type, (hourlyMap.get(type) || 0) + 1);

  // Log to console
  const logLevel = event.severity === SecurityEventSeverity.CRITICAL || event.severity === SecurityEventSeverity.HIGH
    ? 'warn'
    : 'info';

  console[logLevel](`[SECURITY] [${event.severity.toUpperCase()}] ${event.type}: ${message}`, {
    ip: event.ip,
    userId: event.userId,
    metadata,
  });

  // Send critical/high events to Sentry
  if (event.severity === SecurityEventSeverity.CRITICAL || event.severity === SecurityEventSeverity.HIGH) {
    Sentry.captureMessage(`Security Event: ${event.type}`, {
      level: event.severity === SecurityEventSeverity.CRITICAL ? 'error' : 'warning',
      tags: {
        security: 'security_event',
        event_type: event.type,
        severity: event.severity,
      },
      extra: {
        ...event,
        metadata,
      },
    });
  }

  // TODO: Send to external logging service (e.g., Elasticsearch, Splunk)
  // TODO: Send alerts for critical events (e.g., email, Slack, PagerDuty)

  return event;
}

/**
 * Get recent security events
 */
export function getRecentEvents(
  limit: number = 100,
  severity?: SecurityEventSeverity,
  type?: SecurityEventType
): SecurityEvent[] {
  let filtered = [...securityEvents];

  if (severity) {
    filtered = filtered.filter(e => e.severity === severity);
  }

  if (type) {
    filtered = filtered.filter(e => e.type === type);
  }

  return filtered
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Get security metrics
 */
export function getSecurityMetrics(): {
  totalEvents: number;
  eventsBySeverity: Record<SecurityEventSeverity, number>;
  eventsByType: Record<string, number>;
  recentCriticalEvents: number;
  recentHighEvents: number;
  topThreats: Array<{ ip: string; count: number }>;
} {
  const now = Date.now();
  const last24Hours = now - 24 * 60 * 60 * 1000;

  const recentEvents = securityEvents.filter(
    e => e.timestamp.getTime() > last24Hours
  );

  const eventsBySeverity: Record<SecurityEventSeverity, number> = {
    [SecurityEventSeverity.LOW]: 0,
    [SecurityEventSeverity.MEDIUM]: 0,
    [SecurityEventSeverity.HIGH]: 0,
    [SecurityEventSeverity.CRITICAL]: 0,
  };

  const eventsByType: Record<string, number> = {};
  const ipCounts = new Map<string, number>();

  recentEvents.forEach(event => {
    eventsBySeverity[event.severity]++;
    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

    if (event.ip && event.severity !== SecurityEventSeverity.LOW) {
      ipCounts.set(event.ip, (ipCounts.get(event.ip) || 0) + 1);
    }
  });

  const topThreats = Array.from(ipCounts.entries())
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalEvents: recentEvents.length,
    eventsBySeverity,
    eventsByType,
    recentCriticalEvents: eventsBySeverity[SecurityEventSeverity.CRITICAL],
    recentHighEvents: eventsBySeverity[SecurityEventSeverity.HIGH],
    topThreats,
  };
}

/**
 * Get events for specific user
 */
export function getUserSecurityEvents(userId: string, limit: number = 50): SecurityEvent[] {
  return securityEvents
    .filter(e => e.userId === userId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Get events for specific IP
 */
export function getIpSecurityEvents(ip: string, limit: number = 50): SecurityEvent[] {
  return securityEvents
    .filter(e => e.ip === ip)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Get events for specific tenant
 */
export function getTenantSecurityEvents(tenantId: string, limit: number = 100): SecurityEvent[] {
  return securityEvents
    .filter(e => e.tenantId === tenantId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Search events
 */
export function searchSecurityEvents(query: {
  startDate?: Date;
  endDate?: Date;
  severity?: SecurityEventSeverity;
  type?: SecurityEventType;
  userId?: string;
  ip?: string;
  tenantId?: string;
  limit?: number;
}): SecurityEvent[] {
  let filtered = [...securityEvents];

  if (query.startDate) {
    filtered = filtered.filter(e => e.timestamp >= query.startDate!);
  }

  if (query.endDate) {
    filtered = filtered.filter(e => e.timestamp <= query.endDate!);
  }

  if (query.severity) {
    filtered = filtered.filter(e => e.severity === query.severity);
  }

  if (query.type) {
    filtered = filtered.filter(e => e.type === query.type);
  }

  if (query.userId) {
    filtered = filtered.filter(e => e.userId === query.userId);
  }

  if (query.ip) {
    filtered = filtered.filter(e => e.ip === query.ip);
  }

  if (query.tenantId) {
    filtered = filtered.filter(e => e.tenantId === query.tenantId);
  }

  return filtered
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, query.limit || 100);
}

/**
 * Export events to JSON
 */
export function exportSecurityEvents(
  startDate?: Date,
  endDate?: Date
): string {
  const events = searchSecurityEvents({ startDate, endDate, limit: 100000 });

  return JSON.stringify(events, null, 2);
}

/**
 * Export events to CSV
 */
export function exportSecurityEventsCSV(
  startDate?: Date,
  endDate?: Date
): string {
  const events = searchSecurityEvents({ startDate, endDate, limit: 100000 });

  const headers = [
    'ID',
    'Timestamp',
    'Type',
    'Severity',
    'IP',
    'User ID',
    'Tenant ID',
    'Path',
    'Method',
    'Message',
  ];

  const rows = events.map(e => [
    e.id,
    e.timestamp.toISOString(),
    e.type,
    e.severity,
    e.ip,
    e.userId || '',
    e.tenantId || '',
    e.path || '',
    e.method || '',
    `"${e.message.replace(/"/g, '""')}"`,
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
}

/**
 * Clean up old events (keep last 30 days)
 */
export function cleanupOldEvents(): void {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days

  let removed = 0;
  while (securityEvents.length > 0 && securityEvents[0].timestamp.getTime() < cutoff) {
    securityEvents.shift();
    removed++;
  }

  // Clean up old hourly counters
  const hourCutoff = new Date(cutoff).toISOString().substring(0, 13);
  hourlyCounters.forEach((_, hour) => {
    if (hour < hourCutoff) {
      hourlyCounters.delete(hour);
    }
  });

  if (removed > 0) {
    console.log(`[SECURITY MONITOR] Cleaned up ${removed} old events`);
  }
}

// Cleanup every 24 hours
setInterval(cleanupOldEvents, 24 * 60 * 60 * 1000);

/**
 * Get security dashboard data
 */
export function getSecurityDashboard(): {
  metrics: ReturnType<typeof getSecurityMetrics>;
  recentCritical: SecurityEvent[];
  recentHigh: SecurityEvent[];
  timeline: Array<{ hour: string; events: number }>;
} {
  const metrics = getSecurityMetrics();
  const recentCritical = getRecentEvents(10, SecurityEventSeverity.CRITICAL);
  const recentHigh = getRecentEvents(10, SecurityEventSeverity.HIGH);

  // Generate timeline for last 24 hours
  const timeline: Array<{ hour: string; events: number }> = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourKey = hour.toISOString().substring(0, 13);
    const hourMap = hourlyCounters.get(hourKey);
    const eventCount = hourMap
      ? Array.from(hourMap.values()).reduce((sum, count) => sum + count, 0)
      : 0;

    timeline.push({
      hour: hour.toISOString(),
      events: eventCount,
    });
  }

  return {
    metrics,
    recentCritical,
    recentHigh,
    timeline,
  };
}

/**
 * Send security alert (email, Slack, etc.)
 */
export async function sendSecurityAlert(
  event: SecurityEvent,
  recipients: string[]
): Promise<void> {
  // TODO: Implement email/Slack alerting
  console.warn('[SECURITY ALERT]', {
    event,
    recipients,
  });

  Sentry.captureMessage(`Security Alert: ${event.type}`, {
    level: 'error',
    tags: {
      security: 'alert',
      event_type: event.type,
    },
    extra: { event, recipients },
  });
}

/**
 * Check for anomalies and send alerts
 */
export function checkForAnomalies(): void {
  const metrics = getSecurityMetrics();

  // Alert on high number of critical events
  if (metrics.recentCriticalEvents > 5) {
    console.warn(`[SECURITY] Anomaly detected: ${metrics.recentCriticalEvents} critical events in last 24 hours`);
    // TODO: Send alert to security team
  }

  // Alert on high number of failed logins from single IP
  metrics.topThreats.forEach(threat => {
    if (threat.count > 20) {
      console.warn(`[SECURITY] Anomaly detected: ${threat.count} security events from ${threat.ip}`);
      // TODO: Send alert to security team
    }
  });
}

// Check for anomalies every hour
setInterval(checkForAnomalies, 60 * 60 * 1000);
