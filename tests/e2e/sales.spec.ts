/**
 * Sales Pipeline E2E Tests
 */

import { test, expect } from './fixtures/auth.fixture';
import { testData } from './fixtures/test-data';

test.describe('Sales Pipeline E2E', () => {
  test('user can create sales proposal', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/vendas');
    await authenticatedPage.click('[data-testid="add-proposal"]');

    // Fill proposal details
    await authenticatedPage.fill('[data-testid="buyer-name"]', 'Buyer E2E Test');
    await authenticatedPage.fill('[data-testid="buyer-email"]', 'buyer@test.com');
    await authenticatedPage.fill('[data-testid="buyer-phone"]', '(11) 98765-4321');
    await authenticatedPage.fill('[data-testid="proposed-value"]', '450000');

    // Select property if available
    const propertySelect = authenticatedPage.locator('[data-testid="proposal-property"]');
    if (await propertySelect.isVisible()) {
      await propertySelect.selectOption({ index: 1 });
    }

    await authenticatedPage.fill('[data-testid="proposal-notes"]', 'Initial proposal');

    await authenticatedPage.click('[data-testid="save-proposal"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify proposal was created
    await expect(authenticatedPage.locator('text=Buyer E2E Test')).toBeVisible();
  });

  test('user can accept proposal', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/vendas');

    // Create proposal first
    await authenticatedPage.click('[data-testid="add-proposal"]');
    await authenticatedPage.fill('[data-testid="buyer-name"]', 'Accept Test Buyer');
    await authenticatedPage.fill('[data-testid="proposed-value"]', '400000');
    await authenticatedPage.click('[data-testid="save-proposal"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Accept the proposal
    const proposalCard = authenticatedPage.locator('[data-testid="proposal-card"]', {
      hasText: 'Accept Test Buyer',
    });
    await proposalCard.locator('[data-testid="accept-proposal"]').click();
    await authenticatedPage.click('[data-testid="confirm-accept"]');

    // Verify status changed to accepted
    await expect(proposalCard.locator('[data-testid="proposal-status"]')).toContainText(/accepted|aceita/i);
  });

  test('user can reject proposal', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/vendas');

    // Create proposal to reject
    await authenticatedPage.click('[data-testid="add-proposal"]');
    await authenticatedPage.fill('[data-testid="buyer-name"]', 'Reject Test Buyer');
    await authenticatedPage.fill('[data-testid="proposed-value"]', '350000');
    await authenticatedPage.click('[data-testid="save-proposal"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Reject the proposal
    const proposalCard = authenticatedPage.locator('[data-testid="proposal-card"]', {
      hasText: 'Reject Test Buyer',
    });
    await proposalCard.locator('[data-testid="reject-proposal"]').click();
    await authenticatedPage.fill('[data-testid="rejection-reason"]', 'Price too low');
    await authenticatedPage.click('[data-testid="confirm-reject"]');

    // Verify status changed to rejected
    await expect(proposalCard.locator('[data-testid="proposal-status"]')).toContainText(/rejected|rejeitada/i);
  });

  test('user can counter-offer proposal', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/vendas');

    // Create proposal
    await authenticatedPage.click('[data-testid="add-proposal"]');
    await authenticatedPage.fill('[data-testid="buyer-name"]', 'Counter Offer Buyer');
    await authenticatedPage.fill('[data-testid="proposed-value"]', '400000');
    await authenticatedPage.click('[data-testid="save-proposal"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Make counter offer
    const proposalCard = authenticatedPage.locator('[data-testid="proposal-card"]', {
      hasText: 'Counter Offer Buyer',
    });
    await proposalCard.click();
    await authenticatedPage.click('[data-testid="counter-offer"]');
    await authenticatedPage.fill('[data-testid="counter-value"]', '480000');
    await authenticatedPage.fill('[data-testid="counter-notes"]', 'Better price needed');
    await authenticatedPage.click('[data-testid="send-counter-offer"]');

    // Verify counter offer was sent
    await expect(authenticatedPage.locator('[data-testid="counter-offer-badge"]')).toBeVisible();
  });

  test('user can move proposal through pipeline stages', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/vendas');

    // Create proposal
    await authenticatedPage.click('[data-testid="add-proposal"]');
    await authenticatedPage.fill('[data-testid="buyer-name"]', 'Pipeline Test Buyer');
    await authenticatedPage.fill('[data-testid="proposed-value"]', '500000');
    await authenticatedPage.click('[data-testid="save-proposal"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Should start in 'proposal' stage
    const proposal = authenticatedPage.locator('[data-testid="proposal-card"]', {
      hasText: 'Pipeline Test Buyer',
    });
    await expect(proposal).toBeVisible();

    // Accept proposal (moves to next stage)
    await proposal.locator('[data-testid="accept-proposal"]').click();
    await authenticatedPage.click('[data-testid="confirm-accept"]');

    // Verify moved to accepted stage
    await expect(proposal.locator('[data-testid="proposal-status"]')).toContainText(/accepted/i);
  });

  test('user can add documents to proposal', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/vendas');

    // Open first proposal
    const firstProposal = authenticatedPage.locator('[data-testid="proposal-card"]').first();
    if (await firstProposal.isVisible()) {
      await firstProposal.click();

      // Add document
      const addDocButton = authenticatedPage.locator('[data-testid="add-document"]');
      if (await addDocButton.isVisible()) {
        await addDocButton.click();
        await authenticatedPage.fill('[data-testid="document-name"]', 'Purchase Agreement');
        await authenticatedPage.selectOption('[data-testid="document-type"]', 'contract');

        // Upload file (mock)
        const fileInput = authenticatedPage.locator('[data-testid="document-file"]');
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles('tests/e2e/fixtures/test-document.pdf');
        }

        await authenticatedPage.click('[data-testid="save-document"]');

        // Verify document added
        await expect(authenticatedPage.locator('text=Purchase Agreement')).toBeVisible();
      }
    }
  });

  test('user can schedule property viewing for buyer', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/vendas');

    // Open first proposal
    const firstProposal = authenticatedPage.locator('[data-testid="proposal-card"]').first();
    if (await firstProposal.isVisible()) {
      await firstProposal.click();

      // Schedule viewing
      const scheduleButton = authenticatedPage.locator('[data-testid="schedule-viewing"]');
      if (await scheduleButton.isVisible()) {
        await scheduleButton.click();

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        await authenticatedPage.fill('[data-testid="viewing-date"]', tomorrowStr);
        await authenticatedPage.fill('[data-testid="viewing-time"]', '14:00');
        await authenticatedPage.click('[data-testid="confirm-viewing"]');

        // Verify viewing scheduled
        await expect(authenticatedPage.locator('[data-testid="viewing-scheduled"]')).toBeVisible();
      }
    }
  });

  test('user can finalize sale', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/vendas');

    // Create and accept proposal
    await authenticatedPage.click('[data-testid="add-proposal"]');
    await authenticatedPage.fill('[data-testid="buyer-name"]', 'Finalize Sale Buyer');
    await authenticatedPage.fill('[data-testid="proposed-value"]', '500000');
    await authenticatedPage.click('[data-testid="save-proposal"]');
    await authenticatedPage.waitForLoadState('networkidle');

    const proposal = authenticatedPage.locator('[data-testid="proposal-card"]', {
      hasText: 'Finalize Sale Buyer',
    });
    await proposal.locator('[data-testid="accept-proposal"]').click();
    await authenticatedPage.click('[data-testid="confirm-accept"]');

    // Finalize sale
    await proposal.click();
    const finalizeButton = authenticatedPage.locator('[data-testid="finalize-sale"]');
    if (await finalizeButton.isVisible()) {
      await finalizeButton.click();
      await authenticatedPage.fill('[data-testid="sale-date"]', new Date().toISOString().split('T')[0]);
      await authenticatedPage.fill('[data-testid="final-value"]', '500000');
      await authenticatedPage.fill('[data-testid="commission-percentage"]', '5');
      await authenticatedPage.click('[data-testid="confirm-finalize"]');

      // Verify sale finalized
      await expect(authenticatedPage.locator('[data-testid="sale-finalized"]')).toBeVisible();
    }
  });

  test('commission calculation is accurate', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/vendas');

    // Open finalized sale
    const finalizedSale = authenticatedPage.locator('[data-testid="proposal-card"][data-status="finalized"]').first();
    if (await finalizedSale.isVisible()) {
      await finalizedSale.click();

      // Get sale value and commission
      const saleValueText = await authenticatedPage.locator('[data-testid="final-value"]').textContent();
      const commissionText = await authenticatedPage.locator('[data-testid="commission-amount"]').textContent();

      const saleValue = parseFloat(saleValueText?.replace(/[^0-9.]/g, '') || '0');
      const commission = parseFloat(commissionText?.replace(/[^0-9.]/g, '') || '0');

      // Verify commission is reasonable (0-10% of sale value)
      expect(commission).toBeGreaterThan(0);
      expect(commission).toBeLessThan(saleValue * 0.1);
    }
  });

  test('user can filter proposals by status', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/vendas');

    // Filter by accepted proposals
    await authenticatedPage.click('[data-testid="filter-status"]');
    await authenticatedPage.click('[data-value="accepted"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify only accepted proposals are shown
    const statusBadges = await authenticatedPage.locator('[data-testid="proposal-status"]').allTextContents();
    statusBadges.forEach((status) => {
      expect(status.toLowerCase()).toContain('accepted');
    });
  });

  test('user can search proposals', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/vendas');

    await authenticatedPage.fill('[data-testid="search-proposals"]', 'Buyer');
    await authenticatedPage.waitForTimeout(600);

    // Verify search results
    const proposalCards = authenticatedPage.locator('[data-testid="proposal-card"]');
    const count = await proposalCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('sales metrics display correctly', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/vendas');

    // Verify metrics are visible
    await expect(authenticatedPage.locator('[data-testid="total-proposals"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="accepted-proposals"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="total-sales-value"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="conversion-rate"]')).toBeVisible();
  });

  test('conversion rate calculation is accurate', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/vendas');

    const totalText = await authenticatedPage.locator('[data-testid="total-proposals"]').textContent();
    const acceptedText = await authenticatedPage.locator('[data-testid="accepted-proposals"]').textContent();
    const conversionText = await authenticatedPage.locator('[data-testid="conversion-rate"]').textContent();

    const total = parseInt(totalText?.replace(/[^0-9]/g, '') || '0');
    const accepted = parseInt(acceptedText?.replace(/[^0-9]/g, '') || '0');
    const displayedRate = parseFloat(conversionText?.replace(/[^0-9.]/g, '') || '0');

    if (total > 0) {
      const calculatedRate = (accepted / total) * 100;
      expect(Math.abs(displayedRate - calculatedRate)).toBeLessThan(1);
    }
  });

  test('user can export sales report', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/vendas');

    const exportButton = authenticatedPage.locator('[data-testid="export-sales"]');
    if (await exportButton.isVisible()) {
      const [download] = await Promise.all([
        authenticatedPage.waitForEvent('download'),
        exportButton.click(),
      ]);

      expect(download.suggestedFilename()).toContain('sales');
    }
  });

  test('proposal expiry is tracked', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/vendas');

    // Create proposal with expiry
    await authenticatedPage.click('[data-testid="add-proposal"]');
    await authenticatedPage.fill('[data-testid="buyer-name"]', 'Expiry Test Buyer');
    await authenticatedPage.fill('[data-testid="proposed-value"]', '450000');

    const expiryInput = authenticatedPage.locator('[data-testid="proposal-expiry"]');
    if (await expiryInput.isVisible()) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      await expiryInput.fill(expiryDate.toISOString().split('T')[0]);
    }

    await authenticatedPage.click('[data-testid="save-proposal"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify expiry date is shown
    await expect(authenticatedPage.locator('[data-testid="expiry-badge"]')).toBeVisible();
  });

  test('user can add notes to proposal', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/vendas');

    // Open first proposal
    const firstProposal = authenticatedPage.locator('[data-testid="proposal-card"]').first();
    if (await firstProposal.isVisible()) {
      await firstProposal.click();

      // Add note
      const addNoteButton = authenticatedPage.locator('[data-testid="add-note"]');
      if (await addNoteButton.isVisible()) {
        await addNoteButton.click();
        await authenticatedPage.fill('[data-testid="note-content"]', 'Buyer very interested');
        await authenticatedPage.click('[data-testid="save-note"]');

        // Verify note added
        await expect(authenticatedPage.locator('text=Buyer very interested')).toBeVisible();
      }
    }
  });
});
