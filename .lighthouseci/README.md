# Lighthouse CI Configuration

This directory contains Lighthouse CI configuration and reports for ImobiBase.

## What is Lighthouse CI?

Lighthouse CI is a tool that runs Google Lighthouse on every commit and pull request, ensuring that web performance, accessibility, SEO, and best practices remain at a high standard.

## Running Lighthouse CI

### Locally

```bash
# Build the application first
npm run build

# Run Lighthouse CI
npm run lighthouse:ci
```

### In CI/CD

Lighthouse CI runs automatically on every pull request via GitHub Actions. Results are posted as comments on the PR.

## Metrics Tracked

### Performance
- First Contentful Paint (FCP) < 2s
- Largest Contentful Paint (LCP) < 2.5s
- Cumulative Layout Shift (CLS) < 0.1
- Total Blocking Time (TBT) < 300ms
- Speed Index < 3.4s

### Accessibility
- All pages must score 90+ on accessibility
- Color contrast must meet WCAG AA standards
- All images must have alt text
- All interactive elements must have accessible names
- Proper ARIA attributes

### Best Practices
- No console errors
- No vulnerable libraries
- HTTPS enforced
- Proper cache headers

### SEO
- Valid HTML
- Meta descriptions
- Proper heading hierarchy
- Mobile-friendly viewport

## Understanding Results

Lighthouse scores are categorized as:
- 90-100: Good (green)
- 50-89: Needs improvement (orange)
- 0-49: Poor (red)

## Configuration

Edit `lighthouserc.json` to customize:
- Number of runs (default: 3)
- Assertion thresholds
- Which audits to run
- Upload targets

## Troubleshooting

### "No build artifacts found"
Make sure to run `npm run build` before running Lighthouse CI.

### Scores vary between runs
Lighthouse scores can vary slightly between runs. We run 3 times and take the median to reduce variance.

### Failed assertions
Review the detailed report to see which specific audits failed and why.

## Resources

- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Web Vitals](https://web.dev/vitals/)
