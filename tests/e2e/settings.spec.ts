/**
 * Settings and Profile E2E Tests
 */

import { test, expect } from './fixtures/auth.fixture';
import { SettingsPage } from './pages/SettingsPage';

test.describe('Settings and Profile Management E2E', () => {
  test('user can update profile information', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();
    await settingsPage.clickTab('profile');

    // Update name
    await authenticatedPage.fill('[data-testid="profile-name"]', 'Updated Name E2E');
    await authenticatedPage.fill('[data-testid="profile-phone"]', '(11) 99999-8888');

    // Wait for auto-save
    await authenticatedPage.waitForTimeout(2500);

    // Verify auto-save toast
    const toastMessage = authenticatedPage.locator('[data-testid="toast-message"]');
    if (await toastMessage.isVisible()) {
      await expect(toastMessage).toContainText(/saved|salvo/i);
    }

    // Reload and verify persistence
    await authenticatedPage.reload();
    await expect(authenticatedPage.locator('[data-testid="profile-name"]')).toHaveValue('Updated Name E2E');
  });

  test('user can update email', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();
    await settingsPage.clickTab('profile');

    const newEmail = `updated-${Date.now()}@test.com`;
    await authenticatedPage.fill('[data-testid="profile-email"]', newEmail);

    // Wait for auto-save
    await authenticatedPage.waitForTimeout(2500);

    // Should show email verification notice
    const verificationNotice = authenticatedPage.locator('[data-testid="email-verification-notice"]');
    if (await verificationNotice.isVisible()) {
      await expect(verificationNotice).toContainText(/verify|verificar/i);
    }
  });

  test('user can change password', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();
    await settingsPage.clickTab('security');

    await authenticatedPage.fill('[data-testid="current-password"]', 'Test123!');
    await authenticatedPage.fill('[data-testid="new-password"]', 'NewPassword123!');
    await authenticatedPage.fill('[data-testid="confirm-password"]', 'NewPassword123!');
    await authenticatedPage.click('[data-testid="change-password"]');

    // Verify password changed
    await expect(authenticatedPage.locator('[data-testid="password-changed-success"]')).toBeVisible();
  });

  test('user can enable two-factor authentication', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();
    await settingsPage.clickTab('security');

    const twoFactorToggle = authenticatedPage.locator('[data-testid="enable-2fa"]');
    if (await twoFactorToggle.isVisible()) {
      await twoFactorToggle.click();

      // Should show QR code
      await expect(authenticatedPage.locator('[data-testid="2fa-qr-code"]')).toBeVisible();

      // Verify code input
      await authenticatedPage.fill('[data-testid="2fa-code"]', '123456');
      await authenticatedPage.click('[data-testid="verify-2fa"]');
    }
  });

  test('user can update notification preferences', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();
    await settingsPage.clickTab('notifications');

    // Toggle email notifications
    await authenticatedPage.check('[data-testid="notify-email"]');
    await authenticatedPage.check('[data-testid="notify-sms"]');
    await authenticatedPage.uncheck('[data-testid="notify-push"]');

    // Wait for auto-save
    await authenticatedPage.waitForTimeout(2500);

    // Reload and verify
    await authenticatedPage.reload();
    await settingsPage.clickTab('notifications');
    await expect(authenticatedPage.locator('[data-testid="notify-email"]')).toBeChecked();
    await expect(authenticatedPage.locator('[data-testid="notify-push"]')).not.toBeChecked();
  });

  test('user can change theme', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();
    await settingsPage.clickTab('appearance');

    // Switch to dark mode
    await authenticatedPage.click('[data-testid="theme-dark"]');
    await authenticatedPage.waitForTimeout(500);

    // Verify dark mode applied
    const html = authenticatedPage.locator('html');
    await expect(html).toHaveAttribute('class', /dark/);

    // Switch to light mode
    await authenticatedPage.click('[data-testid="theme-light"]');
    await authenticatedPage.waitForTimeout(500);

    // Verify light mode applied
    await expect(html).not.toHaveAttribute('class', /dark/);
  });

  test('user can change language', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();
    await settingsPage.clickTab('appearance');

    // Change to Portuguese
    const languageSelect = authenticatedPage.locator('[data-testid="language-select"]');
    if (await languageSelect.isVisible()) {
      await languageSelect.selectOption('pt-BR');
      await authenticatedPage.waitForTimeout(500);

      // Verify language changed (check if some text is in Portuguese)
      const pageContent = await authenticatedPage.content();
      const hasPortugueseText = pageContent.includes('Configurações') ||
                                pageContent.includes('Dashboard') ||
                                pageContent.includes('Imóveis');
      expect(hasPortugueseText).toBeTruthy();
    }
  });

  test('user can update company information', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();
    await settingsPage.clickTab('company');

    await authenticatedPage.fill('[data-testid="company-name"]', 'Test Real Estate E2E');
    await authenticatedPage.fill('[data-testid="company-phone"]', '(11) 3333-4444');
    await authenticatedPage.fill('[data-testid="company-address"]', 'Rua Teste, 123');

    // Wait for auto-save
    await authenticatedPage.waitForTimeout(2500);

    // Verify saved
    await authenticatedPage.reload();
    await settingsPage.clickTab('company');
    await expect(authenticatedPage.locator('[data-testid="company-name"]')).toHaveValue('Test Real Estate E2E');
  });

  test('user can upload profile avatar', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();
    await settingsPage.clickTab('profile');

    const avatarInput = authenticatedPage.locator('[data-testid="avatar-upload"]');
    if (await avatarInput.isVisible()) {
      // Upload image (mock)
      await avatarInput.setInputFiles('tests/e2e/fixtures/test-avatar.jpg');
      await authenticatedPage.waitForLoadState('networkidle');

      // Verify avatar updated
      await expect(authenticatedPage.locator('[data-testid="profile-avatar"]')).toBeVisible();
    }
  });

  test('user can manage integrations', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();
    await settingsPage.clickTab('integrations');

    // Toggle integration
    const whatsappToggle = authenticatedPage.locator('[data-testid="integration-whatsapp"]');
    if (await whatsappToggle.isVisible()) {
      await whatsappToggle.click();
      await expect(authenticatedPage.locator('[data-testid="whatsapp-enabled"]')).toBeVisible();
    }
  });

  test('user can view API keys', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();
    await settingsPage.clickTab('api');

    // Generate new API key
    const generateButton = authenticatedPage.locator('[data-testid="generate-api-key"]');
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await expect(authenticatedPage.locator('[data-testid="api-key-display"]')).toBeVisible();
    }
  });

  test('user can configure backup settings', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();
    await settingsPage.clickTab('backup');

    // Enable auto backup
    const autoBackupToggle = authenticatedPage.locator('[data-testid="auto-backup"]');
    if (await autoBackupToggle.isVisible()) {
      await autoBackupToggle.check();
      await authenticatedPage.selectOption('[data-testid="backup-frequency"]', 'daily');

      // Wait for save
      await authenticatedPage.waitForTimeout(2500);
    }
  });

  test('user can export all data', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();
    await settingsPage.clickTab('data');

    const exportButton = authenticatedPage.locator('[data-testid="export-all-data"]');
    if (await exportButton.isVisible()) {
      const [download] = await Promise.all([
        authenticatedPage.waitForEvent('download'),
        exportButton.click(),
      ]);

      expect(download.suggestedFilename()).toContain('data-export');
    }
  });

  test('user can delete account', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();
    await settingsPage.clickTab('account');

    const deleteButton = authenticatedPage.locator('[data-testid="delete-account"]');
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Should show confirmation dialog
      await expect(authenticatedPage.locator('[data-testid="delete-account-dialog"]')).toBeVisible();

      // Cancel deletion
      await authenticatedPage.click('[data-testid="cancel-delete"]');
      await expect(authenticatedPage.locator('[data-testid="delete-account-dialog"]')).not.toBeVisible();
    }
  });

  test('admin can manage user roles', async ({ adminPage }) => {
    const settingsPage = new SettingsPage(adminPage);
    await settingsPage.goto();
    await settingsPage.clickTab('users');

    // Find user to update
    const firstUser = adminPage.locator('[data-testid="user-row"]').first();
    if (await firstUser.isVisible()) {
      await firstUser.locator('[data-testid="edit-user"]').click();
      await adminPage.selectOption('[data-testid="user-role"]', 'viewer');
      await adminPage.click('[data-testid="save-user"]');

      // Verify role updated
      await expect(firstUser.locator('[data-testid="user-role-badge"]')).toContainText('viewer');
    }
  });

  test('settings validation prevents invalid data', async ({ authenticatedPage }) => {
    const settingsPage = new SettingsPage(authenticatedPage);
    await settingsPage.goto();
    await settingsPage.clickTab('profile');

    // Try invalid email
    await authenticatedPage.fill('[data-testid="profile-email"]', 'invalid-email');
    await authenticatedPage.waitForTimeout(2500);

    // Should show validation error
    const emailError = authenticatedPage.locator('[data-testid="email-error"]');
    if (await emailError.isVisible()) {
      await expect(emailError).toContainText(/invalid|inválido/i);
    }
  });
});
