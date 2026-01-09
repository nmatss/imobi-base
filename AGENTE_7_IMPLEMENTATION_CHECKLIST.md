# AGENTE 7 - Accessibility Implementation Checklist

## Quick Start Guide for Developers

This checklist ensures new features maintain WCAG 2.1 AA accessibility standards.

---

## ✅ Before Deploying a Feature

### 1. Keyboard Navigation (2.1.1)

- [ ] All interactive elements are keyboard accessible
- [ ] Tab key navigates through all controls
- [ ] Shift+Tab reverses direction
- [ ] No keyboard traps (can escape from all components)
- [ ] Logical tab order (left-to-right, top-to-bottom)

**Test:** Unplug your mouse and navigate using only keyboard.

### 2. Focus Indicators (2.4.7)

- [ ] All focusable elements show visible focus indicator
- [ ] Focus indicator is at least 3px visible width
- [ ] Focus indicator has sufficient contrast (3:1)
- [ ] Focus indicator doesn't rely on color alone

**Test:** Tab through your feature - can you always see where focus is?

### 3. Forms & Inputs

- [ ] All inputs have associated `<label>` with `htmlFor`
- [ ] Required fields marked with `aria-required="true"`
- [ ] Error messages linked with `aria-describedby`
- [ ] Invalid fields marked with `aria-invalid="true"`
- [ ] Placeholder text is NOT used as labels

**Example:**
```tsx
<FormItem>
  <FormLabel htmlFor="email">Email *</FormLabel>
  <FormControl>
    <Input
      id="email"
      type="email"
      aria-required="true"
      aria-invalid={!!errors.email}
      aria-describedby="email-error"
    />
  </FormControl>
  <FormMessage id="email-error">{errors.email?.message}</FormMessage>
</FormItem>
```

### 4. Buttons & Interactive Elements

- [ ] Buttons have descriptive text or `aria-label`
- [ ] Icon-only buttons have `aria-label`
- [ ] Touch targets are at least 44x44px
- [ ] Loading states are announced to screen readers

**Example:**
```tsx
<Button aria-label="Delete property">
  <Trash2 className="w-4 h-4" aria-hidden="true" />
</Button>
```

### 5. Modals & Dialogs

- [ ] Focus moves to modal when opened
- [ ] Focus is trapped within modal
- [ ] Escape key closes modal
- [ ] Focus returns to trigger element when closed
- [ ] Modal has `role="dialog"` and `aria-labelledby`

**Example:**
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete Property</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete this property?
      </DialogDescription>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

### 6. Images & Icons

- [ ] All images have descriptive `alt` text
- [ ] Decorative icons have `aria-hidden="true"`
- [ ] Icon-only controls have text alternative

**Example:**
```tsx
{/* Decorative icon */}
<Home className="w-4 h-4" aria-hidden="true" />

{/* Informative icon */}
<img src="property.jpg" alt="3-bedroom house in downtown" />

{/* Icon button */}
<button aria-label="Go to home">
  <Home aria-hidden="true" />
</button>
```

### 7. Color & Contrast

- [ ] Text contrast is at least 4.5:1 (or 3:1 for large text)
- [ ] UI component contrast is at least 3:1
- [ ] Information not conveyed by color alone
- [ ] Test with color blindness simulator

**Tool:** Use accessibility utilities:
```tsx
import { validateContrast } from '@/lib/accessibility-utils';

const result = validateContrast('#0066FF', '#FFFFFF');
console.log(result.level); // "AA" or "AAA" or "Fail"
```

### 8. Headings & Structure

- [ ] Proper heading hierarchy (h1 → h2 → h3, no skipping)
- [ ] Only one `<h1>` per page
- [ ] Headings are descriptive
- [ ] Semantic HTML used (`<nav>`, `<main>`, `<section>`)

**Example:**
```tsx
<main id="main-content">
  <h1>Properties</h1>

  <section>
    <h2>Active Listings</h2>
    {/* Content */}
  </section>

  <section>
    <h2>Sold Properties</h2>
    {/* Content */}
  </section>
</main>
```

### 9. Lists & Tables

- [ ] Lists use `<ul>`, `<ol>`, or `<dl>`
- [ ] Tables have `<th>` headers with `scope` attribute
- [ ] Complex tables have `<caption>`
- [ ] Screen readers can navigate table structure

**Example:**
```tsx
<table>
  <caption>Property Listings - December 2025</caption>
  <thead>
    <tr>
      <th scope="col">Address</th>
      <th scope="col">Price</th>
      <th scope="col">Status</th>
    </tr>
  </thead>
  <tbody>
    {/* Rows */}
  </tbody>
</table>
```

### 10. Dynamic Content

- [ ] Loading states are announced
- [ ] Updates are announced with `aria-live`
- [ ] Error messages are announced
- [ ] Success messages are announced

**Example:**
```tsx
{/* Polite announcement (doesn't interrupt) */}
<div aria-live="polite" aria-atomic="true">
  {message && <p>{message}</p>}
</div>

{/* Assertive announcement (interrupts) */}
<div aria-live="assertive" role="alert">
  {error && <p>{error}</p>}
</div>
```

---

## 🔧 Quick Fixes for Common Issues

### Issue: Button has no accessible name
```tsx
// ❌ Bad
<button onClick={handleDelete}>
  <Trash2 />
</button>

// ✅ Good
<button onClick={handleDelete} aria-label="Delete property">
  <Trash2 aria-hidden="true" />
</button>
```

### Issue: Input without label
```tsx
// ❌ Bad
<input type="email" placeholder="Email" />

// ✅ Good
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

### Issue: Link without descriptive text
```tsx
// ❌ Bad
<a href="/properties/123">Click here</a>

// ✅ Good
<a href="/properties/123">View property details</a>
```

### Issue: Keyboard trap in modal
```tsx
// ✅ Use built-in Dialog component (handles focus trap)
import { Dialog, DialogContent } from '@/components/ui/dialog';

// ✅ Or use useFocusTrap hook for custom modals
import { useFocusTrap } from '@/hooks/useFocusTrap';

const modalRef = useRef(null);
useFocusTrap({
  containerRef: modalRef,
  enabled: isOpen,
  onEscape: () => setIsOpen(false)
});
```

### Issue: Low color contrast
```tsx
// ❌ Bad - Light gray text on white (#999 on #FFF = 2.85:1)
<p className="text-gray-400">Low contrast text</p>

// ✅ Good - Dark gray text on white (#666 on #FFF = 5.74:1)
<p className="text-gray-600">Good contrast text</p>

// ✅ Even better - Use semantic classes
<p className="text-muted-foreground">Accessible text</p>
```

---

## 🧪 Testing Tools

### Browser DevTools

1. **Chrome Lighthouse**
   - Open DevTools → Lighthouse → Accessibility
   - Automated scan for common issues

2. **Firefox Accessibility Inspector**
   - DevTools → Accessibility
   - Shows focus order, ARIA attributes

3. **axe DevTools Extension**
   - Install from Chrome/Firefox store
   - More detailed accessibility scan

### Keyboard Testing

```bash
# Manual keyboard test script
1. Press Tab - First element focuses (skip link)
2. Continue Tab - All interactive elements receive focus
3. Press Shift+Tab - Reverse navigation works
4. Press Enter on links/buttons - Activates correctly
5. Press Space on buttons/checkboxes - Toggles correctly
6. Press Escape in modals - Closes and returns focus
7. Press Arrow keys in menus - Navigates items
```

### Screen Reader Testing

**Windows (NVDA - Free):**
1. Download NVDA: https://www.nvaccess.org/
2. Start NVDA (Ctrl+Alt+N)
3. Navigate with Tab, Arrow keys
4. Listen to announcements

**macOS (VoiceOver - Built-in):**
1. Enable: System Preferences → Accessibility → VoiceOver
2. Start: Cmd+F5
3. Navigate with VO+Arrow keys (VO = Ctrl+Option)

### Automated Testing

```typescript
// Install dependencies
npm install --save-dev @axe-core/react jest-axe

// Add to test file
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('Component has no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## 📚 Resources

### ImobiBase Accessibility Files

```
/client/src/lib/accessibility-utils.ts     # Color contrast utilities
/client/src/lib/accessibility-context.tsx  # Global a11y settings
/client/src/hooks/useFocusTrap.ts          # Focus trap hook
/client/src/hooks/useKeyboardNav.ts        # Keyboard navigation hook
/client/src/components/accessible/         # Accessible components
/client/src/index.css                      # Focus styles, utilities
```

### External Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM](https://webaim.org/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

### Contrast Checkers

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Coolors Contrast Checker](https://coolors.co/contrast-checker)
- Use built-in utility: `validateContrast(fg, bg)` in accessibility-utils.ts

---

## 🎯 Priority Levels

### P0 - Critical (Must Fix Before Deploy)
- [ ] Keyboard navigation broken
- [ ] Focus indicators missing
- [ ] Forms without labels
- [ ] Keyboard trap in modal
- [ ] Contrast ratio < 3:1

### P1 - High (Fix Within Sprint)
- [ ] Missing alt text on images
- [ ] Improper heading hierarchy
- [ ] Missing ARIA labels
- [ ] Touch targets < 44x44px
- [ ] Contrast ratio 3:1 - 4.5:1

### P2 - Medium (Fix in Next Release)
- [ ] Non-semantic HTML
- [ ] Missing skip links
- [ ] Inconsistent focus order
- [ ] Missing live regions

### P3 - Low (Nice to Have)
- [ ] Enhanced keyboard shortcuts
- [ ] Additional ARIA landmarks
- [ ] High contrast mode improvements

---

## ✨ Pro Tips

1. **Test Early**: Run accessibility checks during development, not after.

2. **Use Semantic HTML**: `<button>` instead of `<div onClick>`.

3. **Don't Remove Outlines**: Focus indicators are critical for keyboard users.

4. **Test with Real Users**: Include users with disabilities in testing.

5. **Automate**: Add accessibility tests to CI/CD pipeline.

6. **Document**: Add accessibility notes to PRs and component docs.

7. **Learn**: Take 30 minutes to learn WCAG basics - it's not complicated!

---

## 🚀 Quick Wins

These take < 5 minutes and provide huge accessibility benefits:

1. ✅ Add `alt` text to all images
2. ✅ Use `<label>` for all form inputs
3. ✅ Add `aria-label` to icon buttons
4. ✅ Use semantic HTML (`<nav>`, `<main>`, `<button>`)
5. ✅ Test with keyboard (unplug mouse for 5 minutes)
6. ✅ Run Lighthouse accessibility audit
7. ✅ Check color contrast with built-in tools
8. ✅ Ensure focus indicators are visible

---

## 📞 Need Help?

1. **Check the full report**: `AGENTE_7_ACCESSIBILITY_KEYBOARD_REPORT.md`
2. **Review utilities**: `/client/src/lib/accessibility-utils.ts`
3. **Use existing components**: Most UI components are already accessible
4. **Ask questions**: Accessibility is a team effort!

---

**Remember:** Accessibility is not a feature - it's a requirement.
Building accessible software benefits everyone, not just users with disabilities.

---

**Last Updated:** 2025-12-28
**Maintained by:** AGENTE 7 - Accessibility Expert
