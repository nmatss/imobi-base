/**
 * STORAGE EXTENSIONS FOR MULTI-TENANT ARCHITECTURE
 * This file contains the additional storage methods for new tables
 * These should be added to the IStorage interface and DbStorage class in storage.ts
 */

import type {
  TenantSettings, InsertTenantSettings,
  UserRole, InsertUserRole,
  UserPermission, InsertUserPermission,
  IntegrationConfig, InsertIntegrationConfig,
  NotificationPreference, InsertNotificationPreference,
  AISettings, InsertAISettings,
  SavedReport, InsertSavedReport
} from "@shared/schema-sqlite";

/**
 * INTERFACE ADDITIONS FOR IStorage
 * Add these methods to the IStorage interface in storage.ts
 */
export interface IStorageExtensions {
  // Tenant Settings
  getTenantSettings(tenantId: string): Promise<TenantSettings | undefined>;
  createTenantSettings(settings: InsertTenantSettings): Promise<TenantSettings>;
  updateTenantSettings(tenantId: string, settings: Partial<InsertTenantSettings>): Promise<TenantSettings | undefined>;

  // User Roles
  getUserRole(id: string): Promise<UserRole | undefined>;
  getUserRolesByTenant(tenantId: string): Promise<UserRole[]>;
  createUserRole(role: InsertUserRole): Promise<UserRole>;
  updateUserRole(id: string, role: Partial<InsertUserRole>): Promise<UserRole | undefined>;
  deleteUserRole(id: string): Promise<boolean>;

  // User Permissions
  getUserPermission(userId: string): Promise<UserPermission | undefined>;
  getUserPermissionsByTenant(tenantId: string): Promise<UserPermission[]>;
  createUserPermission(permission: InsertUserPermission): Promise<UserPermission>;
  updateUserPermission(userId: string, permission: Partial<InsertUserPermission>): Promise<UserPermission | undefined>;

  // Integration Configs
  getIntegrationConfig(id: string): Promise<IntegrationConfig | undefined>;
  getIntegrationConfigsByTenant(tenantId: string): Promise<IntegrationConfig[]>;
  getIntegrationConfigByType(tenantId: string, integrationType: string): Promise<IntegrationConfig | undefined>;
  createIntegrationConfig(config: InsertIntegrationConfig): Promise<IntegrationConfig>;
  updateIntegrationConfig(id: string, config: Partial<InsertIntegrationConfig>): Promise<IntegrationConfig | undefined>;
  deleteIntegrationConfig(id: string): Promise<boolean>;

  // Notification Preferences
  getNotificationPreferences(tenantId: string): Promise<NotificationPreference[]>;
  updateNotificationPreferences(tenantId: string, preferences: InsertNotificationPreference[]): Promise<NotificationPreference[]>;

  // AI Settings
  getAISettings(tenantId: string): Promise<AISettings | undefined>;
  createAISettings(settings: InsertAISettings): Promise<AISettings>;
  updateAISettings(tenantId: string, settings: Partial<InsertAISettings>): Promise<AISettings | undefined>;

  // Saved Reports
  getSavedReport(id: string): Promise<SavedReport | undefined>;
  getSavedReportsByUser(tenantId: string, userId: string): Promise<SavedReport[]>;
  getSavedReportsByTenant(tenantId: string): Promise<SavedReport[]>;
  createSavedReport(report: InsertSavedReport): Promise<SavedReport>;
  updateSavedReport(id: string, report: Partial<InsertSavedReport>): Promise<SavedReport | undefined>;
  deleteSavedReport(id: string): Promise<boolean>;
}

/**
 * EXAMPLE IMPLEMENTATIONS
 * These are example implementations showing the pattern for each method
 * These should be added to the DbStorage class in storage.ts
 */

/*

// ==== TENANT SETTINGS ====

async getTenantSettings(tenantId: string): Promise<TenantSettings | undefined> {
  const [settings] = await db.select().from(schema.tenantSettings)
    .where(eq(schema.tenantSettings.tenantId, tenantId));
  return settings;
}

async createTenantSettings(settings: InsertTenantSettings): Promise<TenantSettings> {
  const id = generateId();
  const [created] = await db.insert(schema.tenantSettings)
    .values({ ...settings, id, createdAt: now(), updatedAt: now() })
    .returning();
  return created;
}

async updateTenantSettings(tenantId: string, settings: Partial<InsertTenantSettings>): Promise<TenantSettings | undefined> {
  const [updated] = await db.update(schema.tenantSettings)
    .set({ ...settings, updatedAt: now() })
    .where(eq(schema.tenantSettings.tenantId, tenantId))
    .returning();
  return updated;
}

// ==== USER ROLES ====

async getUserRole(id: string): Promise<UserRole | undefined> {
  const [role] = await db.select().from(schema.userRoles)
    .where(eq(schema.userRoles.id, id));
  return role;
}

async getUserRolesByTenant(tenantId: string): Promise<UserRole[]> {
  return db.select().from(schema.userRoles)
    .where(eq(schema.userRoles.tenantId, tenantId))
    .orderBy(schema.userRoles.name);
}

async createUserRole(role: InsertUserRole): Promise<UserRole> {
  const id = generateId();
  const [created] = await db.insert(schema.userRoles)
    .values({ ...role, id, createdAt: now() })
    .returning();
  return created;
}

async updateUserRole(id: string, role: Partial<InsertUserRole>): Promise<UserRole | undefined> {
  const [updated] = await db.update(schema.userRoles)
    .set(role)
    .where(eq(schema.userRoles.id, id))
    .returning();
  return updated;
}

async deleteUserRole(id: string): Promise<boolean> {
  await db.delete(schema.userRoles).where(eq(schema.userRoles.id, id));
  return true;
}

// ==== USER PERMISSIONS ====

async getUserPermission(userId: string): Promise<UserPermission | undefined> {
  const [permission] = await db.select().from(schema.userPermissions)
    .where(eq(schema.userPermissions.userId, userId));
  return permission;
}

async getUserPermissionsByTenant(tenantId: string): Promise<UserPermission[]> {
  // Join with users to filter by tenantId
  const users = await db.select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.tenantId, tenantId));

  const userIds = users.map(u => u.id);
  if (userIds.length === 0) return [];

  return db.select().from(schema.userPermissions)
    .where(inArray(schema.userPermissions.userId, userIds));
}

async createUserPermission(permission: InsertUserPermission): Promise<UserPermission> {
  const id = generateId();
  const [created] = await db.insert(schema.userPermissions)
    .values({ ...permission, id, createdAt: now() })
    .returning();
  return created;
}

async updateUserPermission(userId: string, permission: Partial<InsertUserPermission>): Promise<UserPermission | undefined> {
  const [updated] = await db.update(schema.userPermissions)
    .set(permission)
    .where(eq(schema.userPermissions.userId, userId))
    .returning();
  return updated;
}

// ==== INTEGRATION CONFIGS ====

async getIntegrationConfig(id: string): Promise<IntegrationConfig | undefined> {
  const [config] = await db.select().from(schema.integrationConfigs)
    .where(eq(schema.integrationConfigs.id, id));
  return config;
}

async getIntegrationConfigsByTenant(tenantId: string): Promise<IntegrationConfig[]> {
  return db.select().from(schema.integrationConfigs)
    .where(eq(schema.integrationConfigs.tenantId, tenantId))
    .orderBy(schema.integrationConfigs.integrationType);
}

async getIntegrationConfigByType(tenantId: string, integrationType: string): Promise<IntegrationConfig | undefined> {
  const [config] = await db.select().from(schema.integrationConfigs)
    .where(and(
      eq(schema.integrationConfigs.tenantId, tenantId),
      eq(schema.integrationConfigs.integrationType, integrationType)
    ));
  return config;
}

async createIntegrationConfig(config: InsertIntegrationConfig): Promise<IntegrationConfig> {
  const id = generateId();
  const [created] = await db.insert(schema.integrationConfigs)
    .values({ ...config, id, createdAt: now(), updatedAt: now() })
    .returning();
  return created;
}

async updateIntegrationConfig(id: string, config: Partial<InsertIntegrationConfig>): Promise<IntegrationConfig | undefined> {
  const [updated] = await db.update(schema.integrationConfigs)
    .set({ ...config, updatedAt: now() })
    .where(eq(schema.integrationConfigs.id, id))
    .returning();
  return updated;
}

async deleteIntegrationConfig(id: string): Promise<boolean> {
  await db.delete(schema.integrationConfigs).where(eq(schema.integrationConfigs.id, id));
  return true;
}

// ==== NOTIFICATION PREFERENCES ====

async getNotificationPreferences(tenantId: string): Promise<NotificationPreference[]> {
  return db.select().from(schema.notificationPreferences)
    .where(eq(schema.notificationPreferences.tenantId, tenantId))
    .orderBy(schema.notificationPreferences.eventType);
}

async updateNotificationPreferences(tenantId: string, preferences: InsertNotificationPreference[]): Promise<NotificationPreference[]> {
  // Delete existing preferences for this tenant
  await db.delete(schema.notificationPreferences)
    .where(eq(schema.notificationPreferences.tenantId, tenantId));

  // Insert new preferences
  if (preferences.length === 0) return [];

  const created = await db.insert(schema.notificationPreferences)
    .values(preferences.map(p => ({ ...p, id: generateId(), createdAt: now() })))
    .returning();

  return created;
}

// ==== AI SETTINGS ====

async getAISettings(tenantId: string): Promise<AISettings | undefined> {
  const [settings] = await db.select().from(schema.aiSettings)
    .where(eq(schema.aiSettings.tenantId, tenantId));
  return settings;
}

async createAISettings(settings: InsertAISettings): Promise<AISettings> {
  const id = generateId();
  const [created] = await db.insert(schema.aiSettings)
    .values({ ...settings, id, createdAt: now(), updatedAt: now() })
    .returning();
  return created;
}

async updateAISettings(tenantId: string, settings: Partial<InsertAISettings>): Promise<AISettings | undefined> {
  const [updated] = await db.update(schema.aiSettings)
    .set({ ...settings, updatedAt: now() })
    .where(eq(schema.aiSettings.tenantId, tenantId))
    .returning();
  return updated;
}

// ==== SAVED REPORTS ====

async getSavedReport(id: string): Promise<SavedReport | undefined> {
  const [report] = await db.select().from(schema.savedReports)
    .where(eq(schema.savedReports.id, id));
  return report;
}

async getSavedReportsByUser(tenantId: string, userId: string): Promise<SavedReport[]> {
  return db.select().from(schema.savedReports)
    .where(and(
      eq(schema.savedReports.tenantId, tenantId),
      eq(schema.savedReports.userId, userId)
    ))
    .orderBy(desc(schema.savedReports.createdAt));
}

async getSavedReportsByTenant(tenantId: string): Promise<SavedReport[]> {
  return db.select().from(schema.savedReports)
    .where(eq(schema.savedReports.tenantId, tenantId))
    .orderBy(desc(schema.savedReports.createdAt));
}

async createSavedReport(report: InsertSavedReport): Promise<SavedReport> {
  const id = generateId();
  const [created] = await db.insert(schema.savedReports)
    .values({ ...report, id, createdAt: now() })
    .returning();
  return created;
}

async updateSavedReport(id: string, report: Partial<InsertSavedReport>): Promise<SavedReport | undefined> {
  const [updated] = await db.update(schema.savedReports)
    .set(report)
    .where(eq(schema.savedReports.id, id))
    .returning();
  return updated;
}

async deleteSavedReport(id: string): Promise<boolean> {
  await db.delete(schema.savedReports).where(eq(schema.savedReports.id, id));
  return true;
}

*/
