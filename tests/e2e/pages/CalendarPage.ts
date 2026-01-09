import { Page, Locator, expect } from '@playwright/test';

export class CalendarPage {
  readonly page: Page;
  readonly addEventButton: Locator;
  readonly monthView: Locator;
  readonly weekView: Locator;
  readonly dayView: Locator;
  readonly viewMonthButton: Locator;
  readonly viewWeekButton: Locator;
  readonly viewDayButton: Locator;
  readonly todayButton: Locator;
  readonly prevButton: Locator;
  readonly nextButton: Locator;
  readonly calendarGrid: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addEventButton = page.locator('[data-testid="add-event-button"]');
    this.monthView = page.locator('[data-testid="month-view"]');
    this.weekView = page.locator('[data-testid="week-view"]');
    this.dayView = page.locator('[data-testid="day-view"]');
    this.viewMonthButton = page.locator('[data-testid="view-month"]');
    this.viewWeekButton = page.locator('[data-testid="view-week"]');
    this.viewDayButton = page.locator('[data-testid="view-day"]');
    this.todayButton = page.locator('[data-testid="today-button"]');
    this.prevButton = page.locator('[data-testid="prev-button"]');
    this.nextButton = page.locator('[data-testid="next-button"]');
    this.calendarGrid = page.locator('[data-testid="calendar-grid"]');
  }

  async goto() {
    await this.page.goto('/calendar');
  }

  async clickAddEvent() {
    await this.addEventButton.click();
  }

  async scheduleVisit(data: VisitData) {
    await this.clickAddEvent();
    await this.page.locator('[data-testid="event-title"]').fill(data.title);
    await this.page.locator('[data-testid="event-date"]').fill(data.date);
    await this.page.locator('[data-testid="event-time"]').fill(data.time);

    if (data.property) {
      await this.page.locator('[data-testid="event-property"]').click();
      await this.page.locator(`[data-property="${data.property}"]`).click();
    }

    if (data.lead) {
      await this.page.locator('[data-testid="event-lead"]').click();
      await this.page.locator(`[data-lead="${data.lead}"]`).click();
    }

    if (data.notes) {
      await this.page.locator('[data-testid="event-notes"]').fill(data.notes);
    }

    await this.page.locator('[data-testid="save-event"]').click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickEvent(title: string) {
    const event = this.page.locator('[data-testid="calendar-event"]', {
      hasText: title,
    });
    await event.click();
  }

  async editEvent(data: Partial<VisitData>) {
    if (data.title) {
      await this.page.locator('[data-testid="event-title"]').fill(data.title);
    }
    if (data.date) {
      await this.page.locator('[data-testid="event-date"]').fill(data.date);
    }
    if (data.time) {
      await this.page.locator('[data-testid="event-time"]').fill(data.time);
    }

    await this.page.locator('[data-testid="save-event"]').click();
    await this.page.waitForLoadState('networkidle');
  }

  async deleteEvent() {
    await this.page.locator('[data-testid="delete-event"]').click();
    await this.page.locator('[data-testid="confirm-delete"]').click();
  }

  async cancelEvent() {
    await this.page.locator('[data-testid="cancel-event"]').click();
    await this.page.locator('[data-testid="confirm-cancel"]').click();
  }

  async switchToMonthView() {
    await this.viewMonthButton.click();
    await expect(this.monthView).toBeVisible();
  }

  async switchToWeekView() {
    await this.viewWeekButton.click();
    await expect(this.weekView).toBeVisible();
  }

  async switchToDayView() {
    await this.viewDayButton.click();
    await expect(this.dayView).toBeVisible();
  }

  async goToToday() {
    await this.todayButton.click();
  }

  async goToNextPeriod() {
    await this.nextButton.click();
  }

  async goToPrevPeriod() {
    await this.prevButton.click();
  }

  async expectEventVisible(title: string) {
    const event = this.page.locator('[data-testid="calendar-event"]', {
      hasText: title,
    });
    await expect(event).toBeVisible();
  }

  async expectEventExists(title: string) {
    // Alias for expectEventVisible for backward compatibility
    await this.expectEventVisible(title);
  }

  async expectEventCount(count: number) {
    const events = this.page.locator('[data-testid="calendar-event"]');
    await expect(events).toHaveCount(count);
  }
}

interface VisitData {
  title: string;
  date: string;
  time: string;
  property?: string;
  lead?: string;
  notes?: string;
}
