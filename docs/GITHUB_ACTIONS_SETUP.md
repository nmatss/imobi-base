# GitHub Actions CI/CD - Setup Guide

## 🎯 Overview

Automated CI/CD pipeline with:
- ✅ TypeScript type checking
- ✅ Build verification
- ✅ Database schema validation
- ✅ Automated deployment to Vercel
- ✅ Preview deployments for PRs
- ✅ Health checks
- ✅ Sentry integration

---

## 🚀 Quick Setup (10 minutes)

### 1. Get Vercel Token

1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Click "Create Token"
3. Name: `GitHub Actions ImobiBase`
4. Scope: Full Account
5. Copy the token (starts with `vercel_...`)

### 2. Link Vercel Project

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project
vercel link

# Pull environment variables
vercel env pull .env.local
```

### 3. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret Name | Value | How to get |
|-------------|-------|------------|
| `VERCEL_TOKEN` | `vercel_xxx...` | From step 1 above |
| `VERCEL_ORG_ID` | `team_xxx...` | Run `vercel whoami` or check `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `prj_xxx...` | From `.vercel/project.json` after `vercel link` |
| `DATABASE_URL` | `postgresql://...` | Your production database URL (Supabase) |
| `SENTRY_AUTH_TOKEN` | `sntrys_xxx...` | From sentry.io → Settings → Auth Tokens |
| `SENTRY_ORG` | `your-org` | Your Sentry organization slug |

#### Optional Secrets (for future features)

| Secret Name | Purpose | Required? |
|-------------|---------|-----------|
| `CODECOV_TOKEN` | Code coverage reporting | No |
| `SLACK_WEBHOOK` | Deploy notifications to Slack | No |
| `TEST_DATABASE_URL` | Separate DB for integration tests | No |

### 4. Enable GitHub Actions

1. Go to repository → Actions tab
2. If disabled, click "I understand my workflows, go ahead and enable them"
3. Workflows will now run automatically

---

## 📋 Workflows Explained

### 1. CI Workflow (`ci.yml`)

**Triggers:**
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

**Steps:**
1. **TypeScript Check** - Validates all types
2. **Build** - Ensures the app builds successfully
3. **Database Schema Check** - Validates schema files
4. **Summary** - Overall status report

**When it runs:** Every push & PR

**Duration:** ~3-5 minutes

### 2. Production Deploy (`deploy-production.yml`)

**Triggers:**
- Push to `main` branch
- Manual trigger via GitHub UI

**Steps:**
1. Build for production
2. Deploy to Vercel
3. Run database migrations
4. Notify Sentry of deployment
5. Health check
6. Create GitHub deployment

**When it runs:** Only on `main` branch

**Duration:** ~5-10 minutes

**Access:** https://imobibase.com (your production URL)

### 3. Preview Deploy (`deploy-preview.yml`)

**Triggers:**
- Pull requests opened/updated

**Steps:**
1. Build preview version
2. Deploy to Vercel (unique URL per PR)
3. Health check
4. Comment preview URL on PR

**When it runs:** Every PR update

**Duration:** ~3-5 minutes

**Access:** Unique URL per PR (e.g., `imobibase-git-feature-xxx.vercel.app`)

---

## 🔧 Configuration

### Adjust Timeouts

Edit workflow files if jobs are timing out:

```yaml
jobs:
  build:
    timeout-minutes: 15 # Increase from 10 to 15
```

### Add More Checks

```yaml
# In .github/workflows/ci.yml

security-scan:
  name: Security Scan
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm audit --production
```

### Slack Notifications

Add to any workflow:

```yaml
- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Deploy ${{ job.status }}: ${{ github.repository }}"
      }
```

---

## 📊 Monitoring Deployments

### View Workflow Runs

1. Go to GitHub repository → Actions tab
2. Click on a workflow run
3. Expand each job to see details

### Check Deployment Status

```bash
# View recent deployments
vercel ls

# View deployment logs
vercel logs <deployment-url>
```

### Sentry Release Tracking

1. Go to sentry.io → Releases
2. Each production deployment creates a release
3. Associate errors with specific deployments

---

## 🚨 Troubleshooting

### Issue: "VERCEL_TOKEN is not set"

**Solution:** Add `VERCEL_TOKEN` secret to GitHub repository settings

### Issue: "Build failed with exit code 1"

**Checklist:**
- ✅ Does `npm run build` work locally?
- ✅ Are all environment variables set?
- ✅ Is TypeScript type check passing?

### Issue: "Health check failed (HTTP 500)"

**Possible causes:**
- Database connection failed (check `DATABASE_URL`)
- Missing environment variables in Vercel
- Application startup error (check Sentry)

**Debug:**
```bash
# Check Vercel deployment logs
vercel logs <deployment-url> --follow

# Check Sentry for errors
# Go to sentry.io → Issues
```

### Issue: "Permission denied when pushing to main"

**Solution:** Enable "Allow specified actors to bypass required pull requests" in branch protection rules

### Issue: Preview deployments not working

**Checklist:**
- ✅ Is `VERCEL_TOKEN` set correctly?
- ✅ Is the PR from a forked repo? (forks don't have access to secrets by default)
- ✅ Check workflow run logs for specific errors

---

## 🔐 Security Best Practices

### 1. Protect Main Branch

Go to Settings → Branches → Add rule for `main`:

- ✅ Require pull request before merging
- ✅ Require status checks to pass (CI workflow)
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing

### 2. Limit Secret Access

- Don't commit secrets to git
- Rotate secrets regularly (every 90 days)
- Use separate secrets for production vs preview
- Audit secret usage in workflow logs

### 3. Review Deployment PRs

Before merging PRs with deployment changes:
- Test preview deployment thoroughly
- Check Sentry for new errors
- Verify health check passes

---

## 📈 Workflow Evolution

### Phase 1: Current (Basic CI/CD)
- ✅ Type checking
- ✅ Build verification
- ✅ Auto-deploy to Vercel

### Phase 2: Add Testing (Next 2 weeks)
- Unit tests with Vitest
- Integration tests
- E2E tests with Playwright
- Code coverage reporting

### Phase 3: Advanced (Month 2)
- Performance budgets
- Visual regression tests
- Smoke tests after deployment
- Automated rollback on failure

### Phase 4: Enterprise (Month 3+)
- Multi-environment deployments (staging, production)
- Gradual rollouts (canary deployments)
- Load testing in CI
- Security scanning (SAST/DAST)

---

## 🎯 Success Metrics

Track these in GitHub Actions:

| Metric | Target | Current |
|--------|--------|---------|
| **Build time** | < 5 min | ~3 min |
| **CI success rate** | > 95% | TBD |
| **Deploy frequency** | 5-10/day | TBD |
| **Mean time to recovery** | < 1 hour | TBD |
| **Failed deploy rate** | < 5% | TBD |

---

## 📚 Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vercel CLI Docs](https://vercel.com/docs/cli)
- [Vercel GitHub Integration](https://vercel.com/docs/deployments/git/vercel-for-github)
- [Sentry Releases](https://docs.sentry.io/product/releases/)

---

## ✅ Post-Setup Checklist

After configuring everything:

- [ ] Push a commit to `main` - production deployment triggers
- [ ] Production deployment succeeds
- [ ] Health check passes on production URL
- [ ] Create a test PR - preview deployment triggers
- [ ] Preview URL posted as PR comment
- [ ] Preview deployment is accessible
- [ ] CI workflow passes on PR
- [ ] Merge PR - production deployment triggers again
- [ ] Sentry release created for production deploy
- [ ] Team members can see workflow runs

---

## 🚀 Quick Commands

```bash
# Trigger manual production deployment
gh workflow run deploy-production.yml

# View workflow runs
gh run list

# View specific run details
gh run view <run-id>

# Cancel running workflow
gh run cancel <run-id>

# Download build artifacts
gh run download <run-id>
```

---

**Last Updated:** 2024-12-24
**Version:** 1.0.0
**Integration Status:** ✅ Complete
