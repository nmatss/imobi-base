import { test, expect } from './fixtures/auth.fixture';
import { LeadsPage } from './pages/LeadsPage';
import { testData } from './fixtures/test-data';

test.describe('Lead Management E2E', () => {
  test('user can create new lead', async ({ authenticatedPage }) => {
    const leadsPage = new LeadsPage(authenticatedPage);
    await leadsPage.goto();
    await leadsPage.clickAddLead();

    const leadData = testData.lead();

    await authenticatedPage.fill('[data-testid="lead-name"]', leadData.name);
    await authenticatedPage.fill('[data-testid="lead-email"]', leadData.email);
    await authenticatedPage.fill('[data-testid="lead-phone"]', leadData.phone);
    await authenticatedPage.selectOption('[data-testid="lead-source"]', leadData.source);
    await authenticatedPage.fill('[data-testid="lead-notes"]', leadData.notes);
    await authenticatedPage.fill('[data-testid="lead-budget"]', leadData.budget.toString());

    await authenticatedPage.click('[data-testid="save-lead"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify lead appears in 'new' column
    await leadsPage.expectLeadInColumn(leadData.name, 'new');
  });

  test('user can drag lead between kanban columns', async ({ authenticatedPage }) => {
    const leadsPage = new LeadsPage(authenticatedPage);
    await leadsPage.goto();

    // Create a lead first
    const leadData = testData.lead();
    await leadsPage.clickAddLead();
    await authenticatedPage.fill('[data-testid="lead-name"]', leadData.name);
    await authenticatedPage.fill('[data-testid="lead-email"]', leadData.email);
    await authenticatedPage.click('[data-testid="save-lead"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Drag to contacted column
    await leadsPage.dragLeadToColumn(leadData.name, 'contacted');

    // Verify lead is in contacted column
    await leadsPage.expectLeadInColumn(leadData.name, 'contacted');
  });

  test('user can edit lead information', async ({ authenticatedPage }) => {
    const leadsPage = new LeadsPage(authenticatedPage);
    await leadsPage.goto();

    // Click on a lead
    await leadsPage.clickLead('Test Lead');

    // Edit lead details
    await authenticatedPage.click('[data-testid="edit-lead"]');
    await authenticatedPage.fill('[data-testid="lead-name"]', 'Updated Lead Name');
    await authenticatedPage.fill('[data-testid="lead-budget"]', '500000');
    await authenticatedPage.click('[data-testid="save-lead"]');

    // Verify changes
    await expect(
      authenticatedPage.locator('[data-testid="lead-name"]')
    ).toContainText('Updated Lead Name');
  });

  test('user can assign lead to user', async ({ authenticatedPage }) => {
    const leadsPage = new LeadsPage(authenticatedPage);
    await leadsPage.goto();

    await leadsPage.assignToUser('Test Lead', 'John Doe');

    // Verify assignment
    await expect(
      authenticatedPage.locator('[data-testid="assigned-user"]')
    ).toContainText('John Doe');
  });

  test('user can add tags to lead', async ({ authenticatedPage }) => {
    const leadsPage = new LeadsPage(authenticatedPage);
    await leadsPage.goto();

    await leadsPage.addTag('Test Lead', 'Hot Lead');

    // Verify tag is visible
    await expect(
      authenticatedPage.locator('[data-testid="lead-tag"]', { hasText: 'Hot Lead' })
    ).toBeVisible();
  });

  test('user can add interaction to lead', async ({ authenticatedPage }) => {
    const leadsPage = new LeadsPage(authenticatedPage);
    await leadsPage.goto();

    await leadsPage.addInteraction('Test Lead', 'Called customer, very interested');

    // Verify interaction is logged
    await expect(
      authenticatedPage.locator('[data-testid="interaction-item"]', {
        hasText: 'Called customer, very interested',
      })
    ).toBeVisible();
  });

  test('user can create follow-up for lead', async ({ authenticatedPage }) => {
    const leadsPage = new LeadsPage(authenticatedPage);
    await leadsPage.goto();

    await leadsPage.clickLead('Test Lead');

    await authenticatedPage.click('[data-testid="add-followup"]');
    await authenticatedPage.fill('[data-testid="followup-title"]', 'Schedule property visit');
    await authenticatedPage.fill(
      '[data-testid="followup-date"]',
      '2025-12-30'
    );
    await authenticatedPage.fill('[data-testid="followup-time"]', '14:00');
    await authenticatedPage.click('[data-testid="save-followup"]');

    // Verify follow-up is created
    await expect(
      authenticatedPage.locator('[data-testid="followup-item"]', {
        hasText: 'Schedule property visit',
      })
    ).toBeVisible();
  });

  test('user can convert lead to contract', async ({ authenticatedPage }) => {
    const leadsPage = new LeadsPage(authenticatedPage);
    await leadsPage.goto();

    // Move lead to 'won' status first
    await leadsPage.dragLeadToColumn('Test Lead', 'won');

    // Click on lead
    await leadsPage.clickLead('Test Lead');

    // Convert to contract
    await authenticatedPage.click('[data-testid="convert-to-contract"]');

    // Fill contract details
    await authenticatedPage.fill('[data-testid="contract-value"]', '500000');
    await authenticatedPage.selectOption('[data-testid="contract-type"]', 'sale');
    await authenticatedPage.click('[data-testid="save-contract"]');

    // Should redirect to contracts page
    await expect(authenticatedPage).toHaveURL(/\/contracts/);
  });

  test('user can delete lead', async ({ authenticatedPage }) => {
    const leadsPage = new LeadsPage(authenticatedPage);
    await leadsPage.goto();

    // Create a lead to delete
    const leadData = testData.lead();
    await leadsPage.clickAddLead();
    await authenticatedPage.fill('[data-testid="lead-name"]', leadData.name);
    await authenticatedPage.fill('[data-testid="lead-email"]', leadData.email);
    await authenticatedPage.click('[data-testid="save-lead"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Delete the lead
    await leadsPage.clickLead(leadData.name);
    await authenticatedPage.click('[data-testid="delete-lead"]');
    await authenticatedPage.click('[data-testid="confirm-delete"]');

    // Verify lead is removed
    await expect(
      authenticatedPage.locator('[data-testid="lead-card"]', { hasText: leadData.name })
    ).not.toBeVisible();
  });

  test('lead status updates correctly when moved', async ({ authenticatedPage }) => {
    const leadsPage = new LeadsPage(authenticatedPage);
    await leadsPage.goto();

    const leadData = testData.lead();
    await leadsPage.clickAddLead();
    await authenticatedPage.fill('[data-testid="lead-name"]', leadData.name);
    await authenticatedPage.fill('[data-testid="lead-email"]', leadData.email);
    await authenticatedPage.click('[data-testid="save-lead"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Move through the pipeline
    await leadsPage.dragLeadToColumn(leadData.name, 'contacted');
    await leadsPage.expectLeadInColumn(leadData.name, 'contacted');

    await leadsPage.dragLeadToColumn(leadData.name, 'qualified');
    await leadsPage.expectLeadInColumn(leadData.name, 'qualified');

    await leadsPage.dragLeadToColumn(leadData.name, 'proposal');
    await leadsPage.expectLeadInColumn(leadData.name, 'proposal');
  });

  test('user can search leads', async ({ authenticatedPage }) => {
    const leadsPage = new LeadsPage(authenticatedPage);
    await leadsPage.goto();

    await leadsPage.searchLeads('John');
    await authenticatedPage.waitForTimeout(600);

    // Verify search results
    const leadCards = authenticatedPage.locator('[data-testid="lead-card"]');
    const count = await leadCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('user can switch between kanban and list view', async ({ authenticatedPage }) => {
    const leadsPage = new LeadsPage(authenticatedPage);
    await leadsPage.goto();

    await leadsPage.switchToListView();
    await expect(leadsPage.listView).toBeVisible();

    await leadsPage.switchToKanbanView();
    await expect(leadsPage.kanbanView).toBeVisible();
  });

  test('user can filter leads by source', async ({ authenticatedPage }) => {
    const leadsPage = new LeadsPage(authenticatedPage);
    await leadsPage.goto();

    await authenticatedPage.click('[data-testid="filter-source"]');
    await authenticatedPage.click('[data-value="website"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify only website leads are shown
    const leadSources = await authenticatedPage
      .locator('[data-testid="lead-source"]')
      .allTextContents();
    leadSources.forEach((source) => {
      expect(source.toLowerCase()).toContain('website');
    });
  });

  test('user can export leads to CSV', async ({ authenticatedPage }) => {
    const leadsPage = new LeadsPage(authenticatedPage);
    await leadsPage.goto();

    const [download] = await Promise.all([
      authenticatedPage.waitForEvent('download'),
      authenticatedPage.click('[data-testid="export-leads"]'),
    ]);

    expect(download.suggestedFilename()).toContain('leads');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('admin can bulk assign leads', async ({ adminPage }) => {
    const leadsPage = new LeadsPage(adminPage);
    await leadsPage.goto();

    // Select multiple leads
    await adminPage.check('[data-testid="select-all"]');

    // Bulk assign
    await adminPage.click('[data-testid="bulk-assign"]');
    await adminPage.selectOption('[data-testid="assign-user-select"]', 'John Doe');
    await adminPage.click('[data-testid="confirm-bulk-assign"]');

    // Verify assignment
    await expect(
      adminPage.locator('[data-testid="assigned-user"]', { hasText: 'John Doe' }).first()
    ).toBeVisible();
  });

  test('viewer cannot edit leads', async ({ viewerPage }) => {
    const leadsPage = new LeadsPage(viewerPage);
    await leadsPage.goto();

    await leadsPage.clickLead('Test Lead');

    // Edit button should not be visible for viewers
    await expect(viewerPage.locator('[data-testid="edit-lead"]')).not.toBeVisible();
  });
});
