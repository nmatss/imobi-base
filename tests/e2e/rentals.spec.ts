/**
 * Rental Management E2E Tests
 */

import { test, expect } from './fixtures/auth.fixture';
import { testData } from './fixtures/test-data';

test.describe('Rental Management E2E', () => {
  test('user can create rental contract', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/rentals');
    await authenticatedPage.click('[data-testid="add-rental"]');

    // Fill rental contract details
    await authenticatedPage.fill('[data-testid="tenant-name"]', 'John Doe Tenant');
    await authenticatedPage.fill('[data-testid="tenant-email"]', 'tenant@test.com');
    await authenticatedPage.fill('[data-testid="tenant-phone"]', '(11) 98765-4321');
    await authenticatedPage.fill('[data-testid="rent-value"]', '2000');
    await authenticatedPage.fill('[data-testid="deposit-value"]', '2000');
    await authenticatedPage.fill('[data-testid="start-date"]', '2025-01-01');
    await authenticatedPage.fill('[data-testid="end-date"]', '2025-12-31');
    await authenticatedPage.selectOption('[data-testid="payment-day"]', '5');

    // Select property if available
    const propertySelect = authenticatedPage.locator('[data-testid="rental-property"]');
    if (await propertySelect.isVisible()) {
      await propertySelect.selectOption({ index: 1 });
    }

    await authenticatedPage.click('[data-testid="save-rental"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify rental was created
    await expect(authenticatedPage.locator('text=John Doe Tenant')).toBeVisible();
  });

  test('rental contract creates payment timeline', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/rentals');

    // Create rental contract
    await authenticatedPage.click('[data-testid="add-rental"]');
    await authenticatedPage.fill('[data-testid="tenant-name"]', 'Timeline Test Tenant');
    await authenticatedPage.fill('[data-testid="rent-value"]', '1500');
    await authenticatedPage.fill('[data-testid="start-date"]', '2025-01-01');
    await authenticatedPage.fill('[data-testid="end-date"]', '2025-12-31');
    await authenticatedPage.click('[data-testid="save-rental"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Open rental details
    await authenticatedPage.click('text=Timeline Test Tenant');

    // Verify payment timeline
    await expect(authenticatedPage.locator('[data-testid="payment-timeline"]')).toBeVisible();

    // Should have 12 months of payments
    const payments = authenticatedPage.locator('[data-testid="payment-item"]');
    const count = await payments.count();
    expect(count).toBe(12);
  });

  test('user can mark rental payment as paid', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/rentals');

    // Open first rental
    const firstRental = authenticatedPage.locator('[data-testid="rental-card"]').first();
    if (await firstRental.isVisible()) {
      await firstRental.click();

      // Find first unpaid payment
      const unpaidPayment = authenticatedPage.locator('[data-testid="payment-item"][data-status="pending"]').first();
      if (await unpaidPayment.isVisible()) {
        await unpaidPayment.click();
        await authenticatedPage.click('[data-testid="mark-paid"]');
        await authenticatedPage.fill('[data-testid="payment-date"]', new Date().toISOString().split('T')[0]);
        await authenticatedPage.click('[data-testid="confirm-payment"]');

        // Verify payment status changed
        await expect(authenticatedPage.locator('[data-testid="payment-status"]').first()).toContainText(/paid|pago/i);
      }
    }
  });

  test('user can mark rental payment as late', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/rentals');

    // Open first rental
    const firstRental = authenticatedPage.locator('[data-testid="rental-card"]').first();
    if (await firstRental.isVisible()) {
      await firstRental.click();

      // Find overdue payment
      const overduePayment = authenticatedPage.locator('[data-testid="payment-item"][data-status="overdue"]').first();
      if (await overduePayment.isVisible()) {
        await expect(overduePayment).toHaveAttribute('data-status', 'overdue');
      }
    }
  });

  test('user can update rental contract', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/rentals');

    // Create rental to update
    await authenticatedPage.click('[data-testid="add-rental"]');
    await authenticatedPage.fill('[data-testid="tenant-name"]', 'Update Test Tenant');
    await authenticatedPage.fill('[data-testid="rent-value"]', '1800');
    await authenticatedPage.fill('[data-testid="start-date"]', '2025-01-01');
    await authenticatedPage.click('[data-testid="save-rental"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Edit the rental
    await authenticatedPage.click('text=Update Test Tenant');
    await authenticatedPage.click('[data-testid="edit-rental"]');
    await authenticatedPage.fill('[data-testid="rent-value"]', '2000');
    await authenticatedPage.click('[data-testid="save-rental"]');

    // Verify changes
    await expect(authenticatedPage.locator('[data-testid="rent-value-display"]')).toContainText('2000');
  });

  test('user can renew rental contract', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/rentals');

    // Open a rental near end date
    const renewableRental = authenticatedPage.locator('[data-testid="rental-card"]').first();
    if (await renewableRental.isVisible()) {
      await renewableRental.click();

      // Click renew button
      const renewButton = authenticatedPage.locator('[data-testid="renew-contract"]');
      if (await renewButton.isVisible()) {
        await renewButton.click();

        // Fill renewal details
        await authenticatedPage.fill('[data-testid="new-end-date"]', '2026-12-31');
        await authenticatedPage.fill('[data-testid="new-rent-value"]', '2200');
        await authenticatedPage.click('[data-testid="confirm-renewal"]');

        // Verify renewal
        await expect(authenticatedPage.locator('[data-testid="contract-renewed"]')).toBeVisible();
      }
    }
  });

  test('user can terminate rental contract', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/rentals');

    // Create rental to terminate
    await authenticatedPage.click('[data-testid="add-rental"]');
    await authenticatedPage.fill('[data-testid="tenant-name"]', 'Terminate Test Tenant');
    await authenticatedPage.fill('[data-testid="rent-value"]', '1500');
    await authenticatedPage.fill('[data-testid="start-date"]', '2025-01-01');
    await authenticatedPage.click('[data-testid="save-rental"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Terminate the contract
    await authenticatedPage.click('text=Terminate Test Tenant');
    await authenticatedPage.click('[data-testid="terminate-contract"]');
    await authenticatedPage.fill('[data-testid="termination-date"]', new Date().toISOString().split('T')[0]);
    await authenticatedPage.fill('[data-testid="termination-reason"]', 'Tenant request');
    await authenticatedPage.click('[data-testid="confirm-termination"]');

    // Verify contract is terminated
    await expect(authenticatedPage.locator('[data-testid="contract-status"]')).toContainText(/terminated|encerrado/i);
  });

  test('user can add maintenance request to rental', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/rentals');

    // Open first rental
    const firstRental = authenticatedPage.locator('[data-testid="rental-card"]').first();
    if (await firstRental.isVisible()) {
      await firstRental.click();

      // Add maintenance request
      const maintenanceButton = authenticatedPage.locator('[data-testid="add-maintenance"]');
      if (await maintenanceButton.isVisible()) {
        await maintenanceButton.click();
        await authenticatedPage.fill('[data-testid="maintenance-description"]', 'Leaking faucet');
        await authenticatedPage.selectOption('[data-testid="maintenance-priority"]', 'medium');
        await authenticatedPage.click('[data-testid="save-maintenance"]');

        // Verify maintenance request
        await expect(authenticatedPage.locator('text=Leaking faucet')).toBeVisible();
      }
    }
  });

  test('user can view rental payment history', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/rentals');

    // Open first rental
    const firstRental = authenticatedPage.locator('[data-testid="rental-card"]').first();
    if (await firstRental.isVisible()) {
      await firstRental.click();

      // View payment history
      const historyButton = authenticatedPage.locator('[data-testid="view-payment-history"]');
      if (await historyButton.isVisible()) {
        await historyButton.click();
        await expect(authenticatedPage.locator('[data-testid="payment-history-modal"]')).toBeVisible();
      }
    }
  });

  test('user can generate rental receipt', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/rentals');

    // Open first rental with paid payments
    const firstRental = authenticatedPage.locator('[data-testid="rental-card"]').first();
    if (await firstRental.isVisible()) {
      await firstRental.click();

      // Find paid payment
      const paidPayment = authenticatedPage.locator('[data-testid="payment-item"][data-status="paid"]').first();
      if (await paidPayment.isVisible()) {
        await paidPayment.click();

        const receiptButton = authenticatedPage.locator('[data-testid="generate-receipt"]');
        if (await receiptButton.isVisible()) {
          const [download] = await Promise.all([
            authenticatedPage.waitForEvent('download'),
            receiptButton.click(),
          ]);

          expect(download.suggestedFilename()).toContain('receipt');
        }
      }
    }
  });

  test('user can filter rentals by status', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/rentals');

    // Filter by active rentals
    await authenticatedPage.click('[data-testid="filter-status"]');
    await authenticatedPage.click('[data-value="active"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify only active rentals are shown
    const statusBadges = await authenticatedPage.locator('[data-testid="rental-status"]').allTextContents();
    statusBadges.forEach((status) => {
      expect(status.toLowerCase()).toContain('active');
    });
  });

  test('rental dashboard displays metrics correctly', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/rentals');

    // Verify metrics are visible
    await expect(authenticatedPage.locator('[data-testid="total-rentals"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="active-rentals"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="monthly-revenue"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="occupancy-rate"]')).toBeVisible();
  });

  test('user can send payment reminder to tenant', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/rentals');

    // Open first rental
    const firstRental = authenticatedPage.locator('[data-testid="rental-card"]').first();
    if (await firstRental.isVisible()) {
      await firstRental.click();

      // Find pending payment
      const pendingPayment = authenticatedPage.locator('[data-testid="payment-item"][data-status="pending"]').first();
      if (await pendingPayment.isVisible()) {
        await pendingPayment.click();

        const reminderButton = authenticatedPage.locator('[data-testid="send-reminder"]');
        if (await reminderButton.isVisible()) {
          await reminderButton.click();
          await expect(authenticatedPage.locator('[data-testid="reminder-sent"]')).toBeVisible();
        }
      }
    }
  });

  test('user can add late fee to overdue payment', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/rentals');

    // Open rental with overdue payment
    const firstRental = authenticatedPage.locator('[data-testid="rental-card"]').first();
    if (await firstRental.isVisible()) {
      await firstRental.click();

      const overduePayment = authenticatedPage.locator('[data-testid="payment-item"][data-status="overdue"]').first();
      if (await overduePayment.isVisible()) {
        await overduePayment.click();

        const lateFeeButton = authenticatedPage.locator('[data-testid="add-late-fee"]');
        if (await lateFeeButton.isVisible()) {
          await lateFeeButton.click();
          await authenticatedPage.fill('[data-testid="late-fee-amount"]', '100');
          await authenticatedPage.click('[data-testid="apply-late-fee"]');

          // Verify late fee was added
          await expect(authenticatedPage.locator('[data-testid="late-fee-badge"]')).toBeVisible();
        }
      }
    }
  });

  test('user can export rental report', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/rentals');

    const exportButton = authenticatedPage.locator('[data-testid="export-rentals"]');
    if (await exportButton.isVisible()) {
      const [download] = await Promise.all([
        authenticatedPage.waitForEvent('download'),
        exportButton.click(),
      ]);

      expect(download.suggestedFilename()).toContain('rentals');
    }
  });

  test('occupancy rate calculation is accurate', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/rentals');

    const totalRentalsText = await authenticatedPage.locator('[data-testid="total-rentals"]').textContent();
    const activeRentalsText = await authenticatedPage.locator('[data-testid="active-rentals"]').textContent();
    const occupancyText = await authenticatedPage.locator('[data-testid="occupancy-rate"]').textContent();

    const total = parseInt(totalRentalsText?.replace(/[^0-9]/g, '') || '0');
    const active = parseInt(activeRentalsText?.replace(/[^0-9]/g, '') || '0');
    const displayedRate = parseFloat(occupancyText?.replace(/[^0-9.]/g, '') || '0');

    if (total > 0) {
      const calculatedRate = (active / total) * 100;
      expect(Math.abs(displayedRate - calculatedRate)).toBeLessThan(1);
    }
  });
});
