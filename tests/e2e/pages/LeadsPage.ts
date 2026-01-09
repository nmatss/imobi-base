import { Page, Locator, expect } from '@playwright/test';

export class LeadsPage {
  readonly page: Page;
  readonly addLeadButton: Locator;
  readonly searchInput: Locator;
  readonly kanbanView: Locator;
  readonly listView: Locator;
  readonly viewKanbanButton: Locator;
  readonly viewListButton: Locator;

  // Kanban columns
  readonly newColumn: Locator;
  readonly contactedColumn: Locator;
  readonly qualifiedColumn: Locator;
  readonly proposalColumn: Locator;
  readonly wonColumn: Locator;
  readonly lostColumn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addLeadButton = page.locator('[data-testid="add-lead-button"]');
    this.searchInput = page.locator('[data-testid="search-leads"]');
    this.kanbanView = page.locator('[data-testid="kanban-view"]');
    this.listView = page.locator('[data-testid="list-view"]');
    this.viewKanbanButton = page.locator('[data-testid="view-kanban"]');
    this.viewListButton = page.locator('[data-testid="view-list"]');

    // Kanban columns
    this.newColumn = page.locator('[data-testid="kanban-column"][data-status="new"]');
    this.contactedColumn = page.locator('[data-testid="kanban-column"][data-status="contacted"]');
    this.qualifiedColumn = page.locator('[data-testid="kanban-column"][data-status="qualified"]');
    this.proposalColumn = page.locator('[data-testid="kanban-column"][data-status="proposal"]');
    this.wonColumn = page.locator('[data-testid="kanban-column"][data-status="won"]');
    this.lostColumn = page.locator('[data-testid="kanban-column"][data-status="lost"]');
  }

  async goto() {
    await this.page.goto('/leads');
  }

  async clickAddLead() {
    await this.addLeadButton.click();
  }

  async searchLeads(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async dragLeadToColumn(leadName: string, targetStatus: string) {
    const leadCard = this.page.locator(`[data-testid="lead-card"]`, {
      hasText: leadName,
    });
    const targetColumn = this.page.locator(
      `[data-testid="kanban-column"][data-status="${targetStatus}"]`
    );

    await leadCard.dragTo(targetColumn);
    await this.page.waitForLoadState('networkidle');
  }

  async clickLead(leadName: string) {
    const leadCard = this.page.locator(`[data-testid="lead-card"]`, {
      hasText: leadName,
    });
    await leadCard.click();
  }

  async expectLeadInColumn(leadName: string, status: string) {
    const column = this.page.locator(
      `[data-testid="kanban-column"][data-status="${status}"]`
    );
    const lead = column.locator('[data-testid="lead-card"]', {
      hasText: leadName,
    });
    await expect(lead).toBeVisible();
  }

  async expectLeadCount(status: string, count: number) {
    const column = this.page.locator(
      `[data-testid="kanban-column"][data-status="${status}"]`
    );
    const leads = column.locator('[data-testid="lead-card"]');
    await expect(leads).toHaveCount(count);
  }

  async switchToKanbanView() {
    await this.viewKanbanButton.click();
    await expect(this.kanbanView).toBeVisible();
  }

  async switchToListView() {
    await this.viewListButton.click();
    await expect(this.listView).toBeVisible();
  }

  async addInteraction(leadName: string, note: string) {
    await this.clickLead(leadName);
    await this.page.locator('[data-testid="add-interaction"]').click();
    await this.page.locator('[data-testid="interaction-note"]').fill(note);
    await this.page.locator('[data-testid="save-interaction"]').click();
  }

  async addTag(leadName: string, tag: string) {
    await this.clickLead(leadName);
    await this.page.locator('[data-testid="add-tag"]').click();
    await this.page.locator('[data-testid="tag-input"]').fill(tag);
    await this.page.keyboard.press('Enter');
  }

  async assignToUser(leadName: string, userName: string) {
    await this.clickLead(leadName);
    await this.page.locator('[data-testid="assign-user"]').click();
    await this.page.locator(`[data-user="${userName}"]`).click();
  }
}
