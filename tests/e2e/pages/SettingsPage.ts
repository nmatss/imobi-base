import { Page, Locator, expect } from '@playwright/test';

export class SettingsPage {
  readonly page: Page;
  readonly generalTab: Locator;
  readonly securityTab: Locator;
  readonly notificationsTab: Locator;
  readonly brandTab: Locator;
  readonly usersTab: Locator;
  readonly integrationsTab: Locator;
  readonly permissionsTab: Locator;

  // General tab
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly avatarUpload: Locator;
  readonly saveProfileButton: Locator;

  // Security tab
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly changePasswordButton: Locator;
  readonly enable2FAButton: Locator;
  readonly disable2FAButton: Locator;

  // Notifications tab
  readonly emailNotifications: Locator;
  readonly pushNotifications: Locator;
  readonly smsNotifications: Locator;

  // Brand tab
  readonly companyNameInput: Locator;
  readonly logoUpload: Locator;
  readonly primaryColorInput: Locator;
  readonly secondaryColorInput: Locator;

  // Users tab
  readonly inviteUserButton: Locator;
  readonly usersList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.generalTab = page.locator('[data-testid="settings-tab-general"]');
    this.securityTab = page.locator('[data-testid="settings-tab-security"]');
    this.notificationsTab = page.locator('[data-testid="settings-tab-notifications"]');
    this.brandTab = page.locator('[data-testid="settings-tab-brand"]');
    this.usersTab = page.locator('[data-testid="settings-tab-users"]');
    this.integrationsTab = page.locator('[data-testid="settings-tab-integrations"]');
    this.permissionsTab = page.locator('[data-testid="settings-tab-permissions"]');

    // General tab
    this.nameInput = page.locator('[data-testid="profile-name"]');
    this.emailInput = page.locator('[data-testid="profile-email"]');
    this.phoneInput = page.locator('[data-testid="profile-phone"]');
    this.avatarUpload = page.locator('[data-testid="avatar-upload"]');
    this.saveProfileButton = page.locator('[data-testid="save-profile"]');

    // Security tab
    this.currentPasswordInput = page.locator('[data-testid="current-password"]');
    this.newPasswordInput = page.locator('[data-testid="new-password"]');
    this.confirmPasswordInput = page.locator('[data-testid="confirm-password"]');
    this.changePasswordButton = page.locator('[data-testid="change-password"]');
    this.enable2FAButton = page.locator('[data-testid="enable-2fa"]');
    this.disable2FAButton = page.locator('[data-testid="disable-2fa"]');

    // Notifications tab
    this.emailNotifications = page.locator('[data-testid="email-notifications"]');
    this.pushNotifications = page.locator('[data-testid="push-notifications"]');
    this.smsNotifications = page.locator('[data-testid="sms-notifications"]');

    // Brand tab
    this.companyNameInput = page.locator('[data-testid="company-name"]');
    this.logoUpload = page.locator('[data-testid="logo-upload"]');
    this.primaryColorInput = page.locator('[data-testid="primary-color"]');
    this.secondaryColorInput = page.locator('[data-testid="secondary-color"]');

    // Users tab
    this.inviteUserButton = page.locator('[data-testid="invite-user"]');
    this.usersList = page.locator('[data-testid="users-list"]');
  }

  async goto() {
    await this.page.goto('/settings');
  }

  async clickTab(tabName: string) {
    const tabMap: Record<string, Locator> = {
      general: this.generalTab,
      security: this.securityTab,
      notifications: this.notificationsTab,
      brand: this.brandTab,
      users: this.usersTab,
      integrations: this.integrationsTab,
      permissions: this.permissionsTab,
    };
    const tab = tabMap[tabName.toLowerCase()];
    if (tab) {
      await tab.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async goToGeneralTab() {
    await this.generalTab.click();
  }

  async goToSecurityTab() {
    await this.securityTab.click();
  }

  async goToNotificationsTab() {
    await this.notificationsTab.click();
  }

  async goToBrandTab() {
    await this.brandTab.click();
  }

  async goToUsersTab() {
    await this.usersTab.click();
  }

  async updateProfile(data: ProfileData) {
    await this.goToGeneralTab();

    if (data.name) {
      await this.nameInput.fill(data.name);
    }
    if (data.phone) {
      await this.phoneInput.fill(data.phone);
    }

    await this.saveProfileButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async changePassword(currentPassword: string, newPassword: string) {
    await this.goToSecurityTab();
    await this.currentPasswordInput.fill(currentPassword);
    await this.newPasswordInput.fill(newPassword);
    await this.confirmPasswordInput.fill(newPassword);
    await this.changePasswordButton.click();
  }

  async enable2FA() {
    await this.goToSecurityTab();
    await this.enable2FAButton.click();
  }

  async updateNotificationPreferences(
    email: boolean,
    push: boolean,
    sms: boolean
  ) {
    await this.goToNotificationsTab();

    if (email) {
      await this.emailNotifications.check();
    } else {
      await this.emailNotifications.uncheck();
    }

    if (push) {
      await this.pushNotifications.check();
    } else {
      await this.pushNotifications.uncheck();
    }

    if (sms) {
      await this.smsNotifications.check();
    } else {
      await this.smsNotifications.uncheck();
    }

    await this.page.locator('[data-testid="save-notifications"]').click();
  }

  async inviteUser(email: string, role: string) {
    await this.goToUsersTab();
    await this.inviteUserButton.click();
    await this.page.locator('[data-testid="invite-email"]').fill(email);
    await this.page.locator('[data-testid="invite-role"]').click();
    await this.page.locator(`[data-value="${role}"]`).click();
    await this.page.locator('[data-testid="send-invite"]').click();
  }

  async changeUserRole(email: string, role: string) {
    await this.goToUsersTab();
    const userRow = this.page.locator(`[data-testid="user-row"][data-email="${email}"]`);
    await userRow.locator('[data-testid="change-role"]').click();
    await this.page.locator(`[data-value="${role}"]`).click();
  }

  async updateBranding(data: BrandData) {
    await this.goToBrandTab();

    if (data.companyName) {
      await this.companyNameInput.fill(data.companyName);
    }
    if (data.primaryColor) {
      await this.primaryColorInput.fill(data.primaryColor);
    }
    if (data.secondaryColor) {
      await this.secondaryColorInput.fill(data.secondaryColor);
    }

    await this.page.locator('[data-testid="save-brand"]').click();
  }
}

interface ProfileData {
  name?: string;
  phone?: string;
}

interface BrandData {
  companyName?: string;
  primaryColor?: string;
  secondaryColor?: string;
}
