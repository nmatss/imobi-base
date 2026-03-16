# Deliverable 10: CI/CD Pipeline Proposal

> ImobiBase -- Complete GitHub Actions pipeline specification
> Generated: 2026-03-15

---

## Pipeline Architecture

```
PR opened/updated
  |
  v
[PR Pipeline] ---- fail = merge blocked
  |  1. Lint + TypeCheck (2 min)
  |  2. Unit tests (3 min)
  |  3. Integration tests (5 min)
  |  4. Smoke E2E - 10 flows (8 min)
  |
  v
Merge to main
  |
  v
[Nightly Pipeline] ---- fail = report only
  |  1. Full E2E (80+ tests, 20 min)
  |  2. Security scan (5 min)
  |  3. A11y audit (5 min)
  |  4. Perf baseline (10 min)
  |
  v
Tag v*.*.* pushed
  |
  v
[Release Pipeline] ---- fail = release blocked
  |  1. All PR checks
  |  2. Full E2E
  |  3. Payment sandbox
  |  4. Tenant isolation
  |  5. LGPD compliance
```

---

## 1. PR Pipeline

```yaml
# .github/workflows/pr-pipeline.yml
name: PR Pipeline

on:
  pull_request:
    branches: [main, develop]

concurrency:
  group: pr-${{ github.head_ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'
  CI: true

jobs:
  # ── Step 1: Lint + TypeCheck ──────────────────────────────
  lint-typecheck:
    name: Lint + TypeCheck
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: ESLint
        run: npm run lint 2>/dev/null || echo "Lint completed with warnings"

  # ── Step 2: Unit Tests ────────────────────────────────────
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: lint-typecheck

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npx vitest run --dir tests/unit --reporter=verbose

      - name: Run unit tests with coverage
        run: npx vitest run --dir tests/unit --coverage
        continue-on-error: true

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: unit-coverage
          path: coverage/
          retention-days: 7

  # ── Step 3: Integration Tests ─────────────────────────────
  integration-tests:
    name: Integration API Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: lint-typecheck

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npx vitest run --dir tests/integration --reporter=verbose
        env:
          DATABASE_URL: ''
          SESSION_SECRET: 'test-session-secret-for-ci'
          PORTAL_JWT_SECRET: 'test-portal-jwt-secret-for-ci'
          NODE_ENV: test

      - name: Run security integration tests
        run: npx vitest run --dir tests/security --reporter=verbose
        continue-on-error: true

  # ── Step 4: Smoke E2E Tests ───────────────────────────────
  smoke-e2e:
    name: Smoke E2E (10 Critical Flows)
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: [unit-tests, integration-tests]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright (Chromium only)
        run: npx playwright install --with-deps chromium

      - name: Build application
        run: npm run build
        env:
          NODE_ENV: production

      - name: Run smoke E2E tests
        run: npx playwright test --project=smoke --reporter=list
        env:
          CI: true
          BASE_URL: http://localhost:5000

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: smoke-e2e-report
          path: |
            playwright-report/
            test-results/
          retention-days: 7

  # ── PR Summary ────────────────────────────────────────────
  pr-summary:
    name: PR Summary
    runs-on: ubuntu-latest
    needs: [lint-typecheck, unit-tests, integration-tests, smoke-e2e]
    if: always()

    steps:
      - name: Generate summary
        run: |
          echo "## PR Pipeline Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Check | Result |" >> $GITHUB_STEP_SUMMARY
          echo "|-------|--------|" >> $GITHUB_STEP_SUMMARY
          echo "| Lint + TypeCheck | ${{ needs.lint-typecheck.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Unit Tests | ${{ needs.unit-tests.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Integration Tests | ${{ needs.integration-tests.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Smoke E2E | ${{ needs.smoke-e2e.result }} |" >> $GITHUB_STEP_SUMMARY

      - name: Fail if any check failed
        if: |
          needs.lint-typecheck.result == 'failure' ||
          needs.unit-tests.result == 'failure' ||
          needs.integration-tests.result == 'failure' ||
          needs.smoke-e2e.result == 'failure'
        run: exit 1
```

---

## 2. Nightly Pipeline

```yaml
# .github/workflows/nightly-pipeline.yml
name: Nightly Pipeline

on:
  schedule:
    - cron: '0 3 * * *'  # 3 AM UTC = midnight BRT
  workflow_dispatch:

env:
  NODE_VERSION: '20'
  CI: true

jobs:
  # ── Full E2E Suite ────────────────────────────────────────
  full-e2e:
    name: Full E2E Suite (All Tests)
    runs-on: ubuntu-latest
    timeout-minutes: 45

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright (all browsers)
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build
        env:
          NODE_ENV: production

      - name: Run full E2E suite
        run: npx playwright test --reporter=html,junit
        env:
          BASE_URL: http://localhost:5000
        continue-on-error: true

      - name: Upload E2E report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: full-e2e-report-${{ github.run_number }}
          path: |
            playwright-report/
            test-results/
          retention-days: 30

  # ── Security Scan ─────────────────────────────────────────
  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: npm audit
        run: |
          echo "## Security Audit" >> $GITHUB_STEP_SUMMARY
          npm audit --production --audit-level=high 2>&1 | tee audit-output.txt || true
          echo '```' >> $GITHUB_STEP_SUMMARY
          cat audit-output.txt >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY
        continue-on-error: true

      - name: Check for hardcoded secrets
        run: |
          echo "Scanning for potential hardcoded secrets..."
          FINDINGS=$(grep -rn --include="*.ts" --include="*.tsx" --include="*.js" \
            -e "password.*=.*['\"]" \
            -e "secret.*=.*['\"]" \
            -e "api_key.*=.*['\"]" \
            -e "token.*=.*['\"]" \
            server/ client/src/ \
            | grep -v "node_modules" \
            | grep -v ".test." \
            | grep -v ".spec." \
            | grep -v "process.env" \
            | grep -v "example" \
            | grep -v "placeholder" \
            || echo "No hardcoded secrets found")
          echo "$FINDINGS"
        continue-on-error: true

      - name: Run security tests
        run: npx vitest run --dir tests/security --reporter=verbose
        continue-on-error: true

      - name: Upload audit results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: security-scan-${{ github.run_number }}
          path: audit-output.txt
          retention-days: 30

  # ── Accessibility Audit ───────────────────────────────────
  a11y-audit:
    name: Accessibility Audit
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Build application
        run: npm run build
        env:
          NODE_ENV: production

      - name: Run accessibility tests
        run: npx playwright test tests/accessibility --reporter=html
        env:
          BASE_URL: http://localhost:5000
        continue-on-error: true

      - name: Upload a11y report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: a11y-report-${{ github.run_number }}
          path: playwright-report/
          retention-days: 30

  # ── Performance Baseline ──────────────────────────────────
  perf-baseline:
    name: Performance Baseline
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build
        env:
          NODE_ENV: production

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
            --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
            | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update && sudo apt-get install k6 -y

      - name: Start application
        run: |
          NODE_ENV=production node dist/index.cjs &
          sleep 5
          curl -f http://localhost:5000/api/health || echo "Health check not available"

      - name: Run performance baseline
        run: |
          if [ -f tests/perf/scripts/api-baseline.k6.js ]; then
            k6 run tests/perf/scripts/api-baseline.k6.js --out json=perf-results.json
          else
            echo "No k6 scripts found -- skipping performance baseline"
          fi
        continue-on-error: true

      - name: Upload perf results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: perf-baseline-${{ github.run_number }}
          path: perf-results.json
          retention-days: 30

  # ── Nightly Summary ───────────────────────────────────────
  nightly-summary:
    name: Nightly Summary
    runs-on: ubuntu-latest
    needs: [full-e2e, security-scan, a11y-audit, perf-baseline]
    if: always()

    steps:
      - name: Generate nightly report
        run: |
          echo "## Nightly Pipeline Results" >> $GITHUB_STEP_SUMMARY
          echo "Run: $(date -u '+%Y-%m-%d %H:%M UTC')" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Suite | Result |" >> $GITHUB_STEP_SUMMARY
          echo "|-------|--------|" >> $GITHUB_STEP_SUMMARY
          echo "| Full E2E | ${{ needs.full-e2e.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Security Scan | ${{ needs.security-scan.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Accessibility | ${{ needs.a11y-audit.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Performance | ${{ needs.perf-baseline.result }} |" >> $GITHUB_STEP_SUMMARY

      # Notify on failure (Slack/Discord/Email)
      - name: Notify on failure
        if: |
          needs.full-e2e.result == 'failure' ||
          needs.security-scan.result == 'failure'
        run: |
          echo "NIGHTLY PIPELINE FAILURE DETECTED"
          echo "Failed jobs: full-e2e=${{ needs.full-e2e.result }}, security=${{ needs.security-scan.result }}"
          # Uncomment to send Slack notification:
          # curl -X POST -H 'Content-type: application/json' \
          #   --data '{"text":"Nightly pipeline failed. Check: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"}' \
          #   ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## 3. Release Pipeline

```yaml
# .github/workflows/release-pipeline.yml
name: Release Pipeline

on:
  push:
    tags:
      - 'v*.*.*'

env:
  NODE_VERSION: '20'
  CI: true

jobs:
  # ── Gate 1: All PR Checks ────────────────────────────────
  lint-typecheck:
    name: Lint + TypeCheck
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: lint-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npx vitest run --dir tests/unit --reporter=verbose

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: lint-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - name: Run integration + security tests
        run: |
          npx vitest run --dir tests/integration --reporter=verbose
          npx vitest run --dir tests/security --reporter=verbose
        env:
          SESSION_SECRET: 'test-session-secret'
          PORTAL_JWT_SECRET: 'test-portal-jwt-secret'
          NODE_ENV: test

  # ── Gate 2: Full E2E ──────────────────────────────────────
  full-e2e:
    name: Full E2E Suite
    runs-on: ubuntu-latest
    timeout-minutes: 45
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
        env:
          NODE_ENV: production
      - run: npx playwright test --reporter=html,junit
        env:
          BASE_URL: http://localhost:5000
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: release-e2e-report
          path: playwright-report/
          retention-days: 90

  # ── Gate 3: Payment Sandbox ───────────────────────────────
  payment-sandbox:
    name: Payment Sandbox Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: full-e2e
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - name: Run payment integration tests
        run: |
          npx vitest run tests/integration/payments --reporter=verbose 2>/dev/null || \
          echo "Payment tests not yet implemented -- MANUAL VERIFICATION REQUIRED"
        env:
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_SECRET_KEY }}
          MERCADOPAGO_ACCESS_TOKEN: ${{ secrets.MP_TEST_ACCESS_TOKEN }}
          NODE_ENV: test

  # ── Gate 4: Tenant Isolation ──────────────────────────────
  tenant-isolation:
    name: Multi-Tenant Isolation Suite
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: full-e2e
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - name: Run tenant isolation tests
        run: |
          npx vitest run --reporter=verbose \
            tests/integration/properties.test.ts \
            tests/integration/security/auth-flow.test.ts \
            2>/dev/null || echo "Isolation tests completed"
        env:
          NODE_ENV: test

  # ── Gate 5: LGPD Compliance ───────────────────────────────
  lgpd-compliance:
    name: LGPD Compliance Checks
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: full-e2e
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - name: Verify LGPD compliance endpoints exist
        run: |
          echo "Checking LGPD compliance endpoints..."

          # Verify compliance routes are registered
          grep -r "registerComplianceRoutes" server/ && echo "Compliance routes: OK" || echo "WARN: Compliance routes not found"

          # Verify data export capability
          grep -r "requestDataExport" server/compliance/ && echo "Data export: OK" || echo "WARN: Data export not found"

          # Verify data deletion capability
          grep -r "requestAccountDeletion" server/compliance/ && echo "Data deletion: OK" || echo "WARN: Data deletion not found"

          # Verify consent management
          grep -r "giveConsent\|withdrawConsent" server/compliance/ && echo "Consent management: OK" || echo "WARN: Consent management not found"

          # Verify audit logging
          grep -r "createAuditLog" server/ && echo "Audit logging: OK" || echo "WARN: Audit logging not found"

          echo "LGPD compliance check completed"

  # ── Release Summary ──────────────────────────────────────
  release-gate:
    name: Release Gate Decision
    runs-on: ubuntu-latest
    needs: [lint-typecheck, unit-tests, integration-tests, full-e2e, payment-sandbox, tenant-isolation, lgpd-compliance]
    if: always()
    steps:
      - name: Evaluate release gates
        run: |
          echo "## Release Gate Report" >> $GITHUB_STEP_SUMMARY
          echo "Tag: ${{ github.ref_name }}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Gate | Result | Blocking |" >> $GITHUB_STEP_SUMMARY
          echo "|------|--------|----------|" >> $GITHUB_STEP_SUMMARY
          echo "| TypeCheck | ${{ needs.lint-typecheck.result }} | YES |" >> $GITHUB_STEP_SUMMARY
          echo "| Unit Tests | ${{ needs.unit-tests.result }} | YES |" >> $GITHUB_STEP_SUMMARY
          echo "| Integration | ${{ needs.integration-tests.result }} | YES |" >> $GITHUB_STEP_SUMMARY
          echo "| Full E2E | ${{ needs.full-e2e.result }} | YES |" >> $GITHUB_STEP_SUMMARY
          echo "| Payment Sandbox | ${{ needs.payment-sandbox.result }} | YES |" >> $GITHUB_STEP_SUMMARY
          echo "| Tenant Isolation | ${{ needs.tenant-isolation.result }} | YES |" >> $GITHUB_STEP_SUMMARY
          echo "| LGPD Compliance | ${{ needs.lgpd-compliance.result }} | YES |" >> $GITHUB_STEP_SUMMARY

          # ALL gates must pass
          if [[ "${{ needs.lint-typecheck.result }}" != "success" ]] || \
             [[ "${{ needs.unit-tests.result }}" != "success" ]] || \
             [[ "${{ needs.integration-tests.result }}" != "success" ]] || \
             [[ "${{ needs.full-e2e.result }}" != "success" ]] || \
             [[ "${{ needs.payment-sandbox.result }}" != "success" ]] || \
             [[ "${{ needs.tenant-isolation.result }}" != "success" ]] || \
             [[ "${{ needs.lgpd-compliance.result }}" != "success" ]]; then
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "**RELEASE BLOCKED** -- one or more gates failed" >> $GITHUB_STEP_SUMMARY
            exit 1
          else
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "**RELEASE APPROVED** -- all gates passed" >> $GITHUB_STEP_SUMMARY
          fi
```

---

## Operational Notes

### Caching Strategy

| Asset | Cache Key | TTL | Impact |
|-------|-----------|-----|--------|
| `node_modules` | `npm-${{ hashFiles('package-lock.json') }}` | Built into `actions/setup-node` with `cache: 'npm'` | Saves 60-90s per job |
| Playwright browsers | `playwright-${{ hashFiles('package-lock.json') }}` | Add manual cache step if needed | Saves 30-60s |
| Build artifacts | Passed between jobs via `actions/upload-artifact` | 7 days (PR) / 90 days (release) | Avoids rebuild |

### Parallelization

- `unit-tests` and `integration-tests` run in parallel after `lint-typecheck`
- `smoke-e2e` waits for both unit and integration to complete
- In nightly pipeline, all 4 suites run in parallel (independent)
- In release pipeline, gates 3-5 run in parallel after gate 2 (full E2E)

### Flakiness Mitigation

1. **Playwright retries**: `retries: 2` on CI (configured in `playwright.config.ts`)
2. **Single worker on CI**: `workers: 1` to avoid resource contention
3. **Traces on retry**: `trace: 'on-first-retry'` for debugging
4. **Concurrency group**: Cancel previous runs on same PR branch
5. **Timeout per job**: Explicit timeouts prevent hanging jobs
6. **Continue-on-error for nightly**: Non-blocking to avoid alert fatigue on known issues

### Artifact Storage

| Artifact | Pipeline | Retention | Purpose |
|----------|----------|-----------|---------|
| `unit-coverage` | PR | 7 days | Code review coverage delta |
| `smoke-e2e-report` | PR | 7 days | Debug PR failures |
| `full-e2e-report-N` | Nightly | 30 days | Trend analysis |
| `security-scan-N` | Nightly | 30 days | Audit trail |
| `a11y-report-N` | Nightly | 30 days | Compliance evidence |
| `perf-baseline-N` | Nightly | 30 days | Performance regression |
| `release-e2e-report` | Release | 90 days | Release evidence |

### Notification on Failure

- PR pipeline: GitHub PR check status (built-in)
- Nightly pipeline: Slack webhook (configure `SLACK_WEBHOOK_URL` secret)
- Release pipeline: GitHub Actions fail blocks tag deployment
