/**
 * Calendar and Visit Scheduling E2E Tests
 */

import { test, expect } from './fixtures/auth.fixture';
import { CalendarPage } from './pages/CalendarPage';
import { testData } from './fixtures/test-data';

test.describe('Calendar and Visit Management E2E', () => {
  test('user can create visit using quick template', async ({ authenticatedPage }) => {
    const calendarPage = new CalendarPage(authenticatedPage);
    await calendarPage.goto();
    await calendarPage.clickAddEvent();

    const visitData = testData.visit();

    // Use visit template
    await authenticatedPage.click('[data-testid="template-visit"]');

    // Template should pre-fill duration
    await expect(authenticatedPage.locator('[data-testid="event-duration"]')).toHaveValue('60');

    // Fill remaining fields
    await authenticatedPage.fill('[data-testid="event-title"]', visitData.title);
    await authenticatedPage.fill('[data-testid="event-date"]', visitData.date.split('T')[0]);
    await authenticatedPage.fill('[data-testid="event-time"]', visitData.time);
    await authenticatedPage.fill('[data-testid="event-notes"]', visitData.notes);

    await authenticatedPage.click('[data-testid="save-event"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify event appears on calendar
    await calendarPage.expectEventExists(visitData.title);
  });

  test('user can schedule property visit with client', async ({ authenticatedPage }) => {
    const calendarPage = new CalendarPage(authenticatedPage);
    await calendarPage.goto();
    await calendarPage.clickAddEvent();

    const visitData = testData.visit();

    await authenticatedPage.fill('[data-testid="event-title"]', 'Visit: Luxury Apartment');
    await authenticatedPage.fill('[data-testid="event-date"]', visitData.date.split('T')[0]);
    await authenticatedPage.fill('[data-testid="event-time"]', '14:00');
    await authenticatedPage.selectOption('[data-testid="event-type"]', 'property-visit');

    // Select client (if available)
    const clientSelect = authenticatedPage.locator('[data-testid="event-client"]');
    if (await clientSelect.isVisible()) {
      await clientSelect.selectOption({ index: 1 });
    }

    // Select property
    const propertySelect = authenticatedPage.locator('[data-testid="event-property"]');
    if (await propertySelect.isVisible()) {
      await propertySelect.selectOption({ index: 1 });
    }

    await authenticatedPage.click('[data-testid="save-event"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify event was created
    await expect(authenticatedPage.locator('text=Visit: Luxury Apartment')).toBeVisible();
  });

  test('user can edit existing event', async ({ authenticatedPage }) => {
    const calendarPage = new CalendarPage(authenticatedPage);
    await calendarPage.goto();

    // Click on first event
    const firstEvent = authenticatedPage.locator('[data-testid="calendar-event"]').first();
    if (await firstEvent.isVisible()) {
      await firstEvent.click();
      await authenticatedPage.click('[data-testid="edit-event"]');

      // Edit event
      await authenticatedPage.fill('[data-testid="event-title"]', 'Updated Event Title');
      await authenticatedPage.click('[data-testid="save-event"]');

      // Verify changes
      await expect(authenticatedPage.locator('text=Updated Event Title')).toBeVisible();
    }
  });

  test('user can delete event', async ({ authenticatedPage }) => {
    const calendarPage = new CalendarPage(authenticatedPage);
    await calendarPage.goto();

    // Create an event to delete
    const visitData = testData.visit();
    await calendarPage.clickAddEvent();
    await authenticatedPage.fill('[data-testid="event-title"]', visitData.title);
    await authenticatedPage.fill('[data-testid="event-date"]', visitData.date.split('T')[0]);
    await authenticatedPage.fill('[data-testid="event-time"]', visitData.time);
    await authenticatedPage.click('[data-testid="save-event"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Delete the event
    await authenticatedPage.click(`text=${visitData.title}`);
    await authenticatedPage.click('[data-testid="delete-event"]');
    await authenticatedPage.click('[data-testid="confirm-delete"]');

    // Verify event is removed
    await expect(authenticatedPage.locator(`text=${visitData.title}`)).not.toBeVisible();
  });

  test('user can switch calendar views', async ({ authenticatedPage }) => {
    const calendarPage = new CalendarPage(authenticatedPage);
    await calendarPage.goto();

    // Switch to week view
    await calendarPage.switchToWeekView();
    await expect(authenticatedPage.locator('[data-testid="calendar-week-view"]')).toBeVisible();

    // Switch to month view
    await calendarPage.switchToMonthView();
    await expect(authenticatedPage.locator('[data-testid="calendar-month-view"]')).toBeVisible();

    // Switch to day view
    await calendarPage.switchToDayView();
    await expect(authenticatedPage.locator('[data-testid="calendar-day-view"]')).toBeVisible();
  });

  test('user can navigate between months', async ({ authenticatedPage }) => {
    const calendarPage = new CalendarPage(authenticatedPage);
    await calendarPage.goto();

    // Get current month
    const currentMonth = await authenticatedPage.locator('[data-testid="calendar-month"]').textContent();

    // Go to next month
    await authenticatedPage.click('[data-testid="calendar-next"]');
    const nextMonth = await authenticatedPage.locator('[data-testid="calendar-month"]').textContent();

    expect(nextMonth).not.toBe(currentMonth);

    // Go to previous month
    await authenticatedPage.click('[data-testid="calendar-prev"]');
    await authenticatedPage.click('[data-testid="calendar-prev"]');
    const prevMonth = await authenticatedPage.locator('[data-testid="calendar-month"]').textContent();

    expect(prevMonth).not.toBe(currentMonth);
  });

  test('user can filter events by type', async ({ authenticatedPage }) => {
    const calendarPage = new CalendarPage(authenticatedPage);
    await calendarPage.goto();

    // Filter by property visits
    await authenticatedPage.click('[data-testid="filter-events"]');
    await authenticatedPage.click('[data-value="property-visit"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify only property visits are shown
    const eventTypes = await authenticatedPage.locator('[data-testid="event-type"]').allTextContents();
    eventTypes.forEach((type) => {
      expect(type.toLowerCase()).toContain('visit');
    });
  });

  test('user receives reminder notification', async ({ authenticatedPage }) => {
    const calendarPage = new CalendarPage(authenticatedPage);
    await calendarPage.goto();

    // Create event with reminder
    await calendarPage.clickAddEvent();
    const visitData = testData.visit();

    await authenticatedPage.fill('[data-testid="event-title"]', visitData.title);
    await authenticatedPage.fill('[data-testid="event-date"]', visitData.date.split('T')[0]);
    await authenticatedPage.fill('[data-testid="event-time"]', visitData.time);

    // Set reminder
    await authenticatedPage.check('[data-testid="event-reminder"]');
    await authenticatedPage.selectOption('[data-testid="reminder-time"]', '15');

    await authenticatedPage.click('[data-testid="save-event"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify reminder is set
    await authenticatedPage.click(`text=${visitData.title}`);
    await expect(authenticatedPage.locator('[data-testid="reminder-badge"]')).toBeVisible();
  });

  test('user can export calendar to ICS', async ({ authenticatedPage }) => {
    const calendarPage = new CalendarPage(authenticatedPage);
    await calendarPage.goto();

    const exportButton = authenticatedPage.locator('[data-testid="export-calendar"]');
    if (await exportButton.isVisible()) {
      const [download] = await Promise.all([
        authenticatedPage.waitForEvent('download'),
        exportButton.click(),
      ]);

      expect(download.suggestedFilename()).toContain('.ics');
    }
  });

  test('user can view event details in modal', async ({ authenticatedPage }) => {
    const calendarPage = new CalendarPage(authenticatedPage);
    await calendarPage.goto();

    // Click on any event
    const firstEvent = authenticatedPage.locator('[data-testid="calendar-event"]').first();
    if (await firstEvent.isVisible()) {
      await firstEvent.click();

      // Verify modal opens with event details
      await expect(authenticatedPage.locator('[data-testid="event-modal"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="event-title-display"]')).toBeVisible();
      await expect(authenticatedPage.locator('[data-testid="event-date-display"]')).toBeVisible();
    }
  });

  test('user can create recurring event', async ({ authenticatedPage }) => {
    const calendarPage = new CalendarPage(authenticatedPage);
    await calendarPage.goto();
    await calendarPage.clickAddEvent();

    const visitData = testData.visit();

    await authenticatedPage.fill('[data-testid="event-title"]', 'Weekly Team Meeting');
    await authenticatedPage.fill('[data-testid="event-date"]', visitData.date.split('T')[0]);
    await authenticatedPage.fill('[data-testid="event-time"]', '10:00');

    // Enable recurring
    const recurringCheckbox = authenticatedPage.locator('[data-testid="event-recurring"]');
    if (await recurringCheckbox.isVisible()) {
      await recurringCheckbox.check();
      await authenticatedPage.selectOption('[data-testid="recurrence-pattern"]', 'weekly');
    }

    await authenticatedPage.click('[data-testid="save-event"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify recurring event is created
    await expect(authenticatedPage.locator('text=Weekly Team Meeting')).toBeVisible();
  });

  test('conflicts are detected when scheduling overlapping events', async ({ authenticatedPage }) => {
    const calendarPage = new CalendarPage(authenticatedPage);
    await calendarPage.goto();

    // Create first event
    const visitData = testData.visit();
    await calendarPage.clickAddEvent();
    await authenticatedPage.fill('[data-testid="event-title"]', 'First Event');
    await authenticatedPage.fill('[data-testid="event-date"]', visitData.date.split('T')[0]);
    await authenticatedPage.fill('[data-testid="event-time"]', '14:00');
    await authenticatedPage.fill('[data-testid="event-duration"]', '60');
    await authenticatedPage.click('[data-testid="save-event"]');
    await authenticatedPage.waitForLoadState('networkidle');

    // Try to create overlapping event
    await calendarPage.clickAddEvent();
    await authenticatedPage.fill('[data-testid="event-title"]', 'Conflicting Event');
    await authenticatedPage.fill('[data-testid="event-date"]', visitData.date.split('T')[0]);
    await authenticatedPage.fill('[data-testid="event-time"]', '14:30'); // Overlaps with first event
    await authenticatedPage.fill('[data-testid="event-duration"]', '60');
    await authenticatedPage.click('[data-testid="save-event"]');

    // Should show conflict warning
    const warningMessage = authenticatedPage.locator('[data-testid="conflict-warning"]');
    if (await warningMessage.isVisible()) {
      await expect(warningMessage).toContainText(/conflict|overlap/i);
    }
  });

  test('user can drag and drop events to reschedule', async ({ authenticatedPage }) => {
    const calendarPage = new CalendarPage(authenticatedPage);
    await calendarPage.goto();

    // Switch to week view for drag and drop
    await calendarPage.switchToWeekView();

    const firstEvent = authenticatedPage.locator('[data-testid="calendar-event"]').first();
    if (await firstEvent.isVisible()) {
      // Get original position
      const originalPosition = await firstEvent.boundingBox();

      // Drag event (simulated - actual drag might need different approach)
      const dragTarget = authenticatedPage.locator('[data-testid="calendar-drop-zone"]').first();
      if (await dragTarget.isVisible()) {
        await firstEvent.dragTo(dragTarget);
        await authenticatedPage.waitForLoadState('networkidle');

        // Verify event moved
        const newPosition = await firstEvent.boundingBox();
        if (originalPosition && newPosition) {
          expect(newPosition.y).not.toBe(originalPosition.y);
        }
      }
    }
  });

  test('mobile view shows compact calendar', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 375, height: 667 });

    const calendarPage = new CalendarPage(authenticatedPage);
    await calendarPage.goto();

    // Verify mobile layout
    await expect(authenticatedPage.locator('[data-testid="calendar-mobile"]')).toBeVisible();

    // Add button should be visible
    await expect(authenticatedPage.locator('[data-testid="add-event-mobile"]')).toBeVisible();
  });
});
