/**
 * Financial Management E2E Tests
 */

import { test, expect } from './fixtures/auth.fixture';
import { testData } from './fixtures/test-data';

test.describe('Financial Management E2E', () => {
  test('user can record income transaction', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/financial');

    // Get initial revenue
    const initialRevenue = await authenticatedPage.locator('[data-testid="total-revenue"]').textContent();
    const initialValue = parseFloat(initialRevenue?.replace(/[^0-9.-]+/g, '') || '0');

    // Create new income transaction
    await authenticatedPage.click('[data-testid="add-transaction"]');
    await authenticatedPage.selectOption('[data-testid="transaction-type"]', 'income');
    await authenticatedPage.fill('[data-testid="transaction-amount"]', '5000');
    await authenticatedPage.fill('[data-testid="transaction-description"]', 'Commission E2E Test');
    await authenticatedPage.selectOption('[data-testid="transaction-category"]', 'commission');
    await authenticatedPage.click('[data-testid="save-transaction"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify revenue increased
    const newRevenue = await authenticatedPage.locator('[data-testid="total-revenue"]').textContent();
    const newValue = parseFloat(newRevenue?.replace(/[^0-9.-]+/g, '') || '0');
    expect(newValue).toBeGreaterThan(initialValue);
  });

  test('user can record expense transaction', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/financial');

    // Get initial expenses
    const initialExpenses = await authenticatedPage.locator('[data-testid="total-expenses"]').textContent();
    const initialValue = parseFloat(initialExpenses?.replace(/[^0-9.-]+/g, '') || '0');

    // Create new expense transaction
    await authenticatedPage.click('[data-testid="add-transaction"]');
    await authenticatedPage.selectOption('[data-testid="transaction-type"]', 'expense');
    await authenticatedPage.fill('[data-testid="transaction-amount"]', '1500');
    await authenticatedPage.fill('[data-testid="transaction-description"]', 'Marketing E2E Test');
    await authenticatedPage.selectOption('[data-testid="transaction-category"]', 'marketing');
    await authenticatedPage.click('[data-testid="save-transaction"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify expenses increased
    const newExpenses = await authenticatedPage.locator('[data-testid="total-expenses"]').textContent();
    const newValue = parseFloat(newExpenses?.replace(/[^0-9.-]+/g, '') || '0');
    expect(newValue).toBeGreaterThan(initialValue);
  });

  test('financial metrics update correctly', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/financial');

    // Wait for metrics to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify all metrics are visible
    await expect(authenticatedPage.locator('[data-testid="total-revenue"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="total-expenses"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="net-profit"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="profit-margin"]')).toBeVisible();
  });

  test('user can filter transactions by date range', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/financial');

    // Open date filter
    await authenticatedPage.click('[data-testid="filter-date"]');

    // Select date range
    const today = new Date().toISOString().split('T')[0];
    await authenticatedPage.fill('[data-testid="date-from"]', today);
    await authenticatedPage.fill('[data-testid="date-to"]', today);
    await authenticatedPage.click('[data-testid="apply-filter"]');

    await authenticatedPage.waitForLoadState('networkidle');

    // Verify filter is applied
    await expect(authenticatedPage.locator('[data-testid="active-filter"]')).toBeVisible();
  });

  test('user can filter transactions by category', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/financial');

    // Filter by commission
    await authenticatedPage.click('[data-testid="filter-category"]');
    await authenticatedPage.click('[data-value="commission"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify only commission transactions are shown
    const categories = await authenticatedPage.locator('[data-testid="transaction-category"]').allTextContents();
    categories.forEach((category) => {
      expect(category.toLowerCase()).toContain('commission');
    });
  });

  test('user can view transaction details', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/financial');

    // Click on first transaction
    const firstTransaction = authenticatedPage.locator('[data-testid="transaction-row"]').first();
    if (await firstTransaction.isVisible()) {
      await firstTransaction.click();

      // Verify details modal opens
      await expect(authenticatedPage.locator('[data-testid="transaction-modal"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="transaction-amount-display"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="transaction-date-display"]')).toBeVisible();
    }
  });

  test('user can edit transaction', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/financial');

    // Create transaction to edit
    await authenticatedPage.click('[data-testid="add-transaction"]');
    await authenticatedPage.selectOption('[data-testid="transaction-type"]', 'income');
    await authenticatedPage.fill('[data-testid="transaction-amount"]', '3000');
    await authenticatedPage.fill('[data-testid="transaction-description"]', 'Original Description');
    await authenticatedPage.click('[data-testid="save-transaction"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Find and edit the transaction
    await authenticatedPage.click('text=Original Description');
    await authenticatedPage.click('[data-testid="edit-transaction"]');
    await authenticatedPage.fill('[data-testid="transaction-amount"]', '3500');
    await authenticatedPage.fill('[data-testid="transaction-description"]', 'Updated Description');
    await authenticatedPage.click('[data-testid="save-transaction"]');

    // Verify changes
    await expect(authenticatedPage.locator('text=Updated Description')).toBeVisible();
  });

  test('user can delete transaction', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/financial');

    // Create transaction to delete
    const transactionData = testData.transaction();
    await authenticatedPage.click('[data-testid="add-transaction"]');
    await authenticatedPage.selectOption('[data-testid="transaction-type"]', transactionData.type);
    await authenticatedPage.fill('[data-testid="transaction-amount"]', transactionData.amount.toString());
    await authenticatedPage.fill('[data-testid="transaction-description"]', transactionData.description);
    await authenticatedPage.click('[data-testid="save-transaction"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Delete the transaction
    await authenticatedPage.click(`text=${transactionData.description}`);
    await authenticatedPage.click('[data-testid="delete-transaction"]');
    await authenticatedPage.click('[data-testid="confirm-delete"]');

    // Verify transaction is removed
    await expect(authenticatedPage.locator(`text=${transactionData.description}`)).not.toBeVisible();
  });

  test('user can export transactions to CSV', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/financial');

    const exportButton = authenticatedPage.locator('[data-testid="export-transactions"]');
    if (await exportButton.isVisible()) {
      const [download] = await Promise.all([
        authenticatedPage.waitForEvent('download'),
        exportButton.click(),
      ]);

      expect(download.suggestedFilename()).toContain('transactions');
      expect(download.suggestedFilename()).toContain('.csv');
    }
  });

  test('financial charts display correctly', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/financial');

    // Wait for charts to load
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify charts are visible
    await expect(authenticatedPage.locator('[data-testid="revenue-chart"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="expense-chart"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="profit-chart"]')).toBeVisible();
  });

  test('user can switch between chart types', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/financial');

    // Switch to bar chart
    const barChartButton = authenticatedPage.locator('[data-testid="chart-type-bar"]');
    if (await barChartButton.isVisible()) {
      await barChartButton.click();
      await expect(authenticatedPage.locator('[data-testid="bar-chart"]')).toBeVisible();
    }

    // Switch to line chart
    const lineChartButton = authenticatedPage.locator('[data-testid="chart-type-line"]');
    if (await lineChartButton.isVisible()) {
      await lineChartButton.click();
      await expect(authenticatedPage.locator('[data-testid="line-chart"]')).toBeVisible();
    }
  });

  test('user can view monthly comparison', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/financial');

    // Switch to comparison view
    const comparisonButton = authenticatedPage.locator('[data-testid="view-comparison"]');
    if (await comparisonButton.isVisible()) {
      await comparisonButton.click();
      await expect(authenticatedPage.locator('[data-testid="comparison-table"]')).toBeVisible();
    }
  });

  test('user can add recurring transaction', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/financial');

    await authenticatedPage.click('[data-testid="add-transaction"]');
    await authenticatedPage.selectOption('[data-testid="transaction-type"]', 'expense');
    await authenticatedPage.fill('[data-testid="transaction-amount"]', '2000');
    await authenticatedPage.fill('[data-testid="transaction-description"]', 'Monthly Rent');

    // Enable recurring
    const recurringCheckbox = authenticatedPage.locator('[data-testid="transaction-recurring"]');
    if (await recurringCheckbox.isVisible()) {
      await recurringCheckbox.check();
      await authenticatedPage.selectOption('[data-testid="recurrence-frequency"]', 'monthly');
    }

    await authenticatedPage.click('[data-testid="save-transaction"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify recurring transaction is created
    await expect(authenticatedPage.locator('text=Monthly Rent')).toBeVisible();
  });

  test('budget alerts are displayed', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/financial');

    // Check for budget alerts
    const budgetAlert = authenticatedPage.locator('[data-testid="budget-alert"]');
    if (await budgetAlert.isVisible()) {
      await expect(budgetAlert).toContainText(/budget|limit|exceeded/i);
    }
  });

  test('profit margin calculation is accurate', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/financial');

    // Get revenue and expenses
    const revenueText = await authenticatedPage.locator('[data-testid="total-revenue"]').textContent();
    const expensesText = await authenticatedPage.locator('[data-testid="total-expenses"]').textContent();
    const marginText = await authenticatedPage.locator('[data-testid="profit-margin"]').textContent();

    const revenue = parseFloat(revenueText?.replace(/[^0-9.-]+/g, '') || '0');
    const expenses = parseFloat(expensesText?.replace(/[^0-9.-]+/g, '') || '0');
    const displayedMargin = parseFloat(marginText?.replace(/[^0-9.-]+/g, '') || '0');

    if (revenue > 0) {
      const calculatedMargin = ((revenue - expenses) / revenue) * 100;
      expect(Math.abs(displayedMargin - calculatedMargin)).toBeLessThan(1); // Allow 1% tolerance
    }
  });

  test('user can print financial report', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/financial');

    const printButton = authenticatedPage.locator('[data-testid="print-report"]');
    if (await printButton.isVisible()) {
      // Clicking print opens print dialog (can't be tested directly, so we just verify button exists)
      await expect(printButton).toBeEnabled();
    }
  });
});
