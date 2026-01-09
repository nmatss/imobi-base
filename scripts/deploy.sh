#!/bin/bash

# ==================================
# ImobiBase Deployment Script
# ==================================
# Usage: ./scripts/deploy.sh [staging|production]
# ==================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    log_error "Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

log_info "Starting deployment to $ENVIRONMENT..."

# 1. Pre-deployment checks
log_info "Running pre-deployment checks..."

# Check if on correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$ENVIRONMENT" == "production" && "$CURRENT_BRANCH" != "main" ]]; then
    log_error "Production deployments must be from 'main' branch. Current: $CURRENT_BRANCH"
    exit 1
fi

if [[ "$ENVIRONMENT" == "staging" && "$CURRENT_BRANCH" != "develop" ]]; then
    log_warn "Staging deployments are usually from 'develop' branch. Current: $CURRENT_BRANCH"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    log_error "You have uncommitted changes. Please commit or stash them first."
    git status -s
    exit 1
fi

# 2. Run tests
log_info "Running tests..."
npm run test || {
    log_error "Tests failed! Aborting deployment."
    exit 1
}

log_info "Running TypeScript check..."
npm run check || {
    log_error "TypeScript check failed! Aborting deployment."
    exit 1
}

# 3. Build application
log_info "Building application..."
npm run build || {
    log_error "Build failed! Aborting deployment."
    exit 1
}

# 4. Create backup (for Docker deployments)
if [[ -f "docker-compose.yml" ]]; then
    log_info "Creating backup..."
    mkdir -p "$BACKUP_DIR"

    # Backup database
    if command -v docker-compose &> /dev/null; then
        docker-compose exec -T postgres pg_dump -U imobibase imobibase > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql" || log_warn "Database backup failed"
    fi

    # Backup .env file
    if [[ "$ENVIRONMENT" == "production" ]]; then
        cp .env.production "$BACKUP_DIR/.env.production_$TIMESTAMP" 2>/dev/null || log_warn ".env.production not found"
    else
        cp .env.staging "$BACKUP_DIR/.env.staging_$TIMESTAMP" 2>/dev/null || log_warn ".env.staging not found"
    fi
fi

# 5. Deploy based on environment
if [[ "$ENVIRONMENT" == "production" ]]; then
    log_info "Deploying to production..."

    # Deploy to Vercel
    if command -v vercel &> /dev/null; then
        log_info "Deploying to Vercel..."
        vercel --prod --yes || {
            log_error "Vercel deployment failed!"
            exit 1
        }
    fi

    # Or deploy with Docker
    if [[ -f "docker-compose.yml" ]]; then
        log_info "Deploying with Docker..."
        docker-compose down
        docker-compose up -d --build || {
            log_error "Docker deployment failed!"
            exit 1
        }
    fi

elif [[ "$ENVIRONMENT" == "staging" ]]; then
    log_info "Deploying to staging..."

    # Deploy to Vercel staging
    if command -v vercel &> /dev/null; then
        log_info "Deploying to Vercel staging..."
        vercel --yes || {
            log_error "Vercel staging deployment failed!"
            exit 1
        }
    fi
fi

# 6. Run database migrations
log_info "Running database migrations..."
if [[ -f "migrations/add-performance-indexes.sql" ]]; then
    npm run db:migrate:indexes || log_warn "Database migrations failed"
fi

# 7. Health check
log_info "Performing health check..."
sleep 5  # Wait for deployment to stabilize

if [[ "$ENVIRONMENT" == "production" ]]; then
    HEALTH_URL="https://imobibase.com/api/health"
else
    HEALTH_URL="https://staging-imobibase.vercel.app/api/health"
fi

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

if [[ "$HTTP_STATUS" == "200" ]]; then
    log_info "Health check passed! (HTTP $HTTP_STATUS)"
else
    log_error "Health check failed! (HTTP $HTTP_STATUS)"
    log_error "Deployment may have issues. Please check logs."
    exit 1
fi

# 8. Notify Sentry of deployment
if [[ -n "$SENTRY_AUTH_TOKEN" ]]; then
    log_info "Notifying Sentry of deployment..."
    SENTRY_RELEASE=$(git rev-parse HEAD)

    curl -X POST "https://sentry.io/api/0/organizations/$SENTRY_ORG/releases/" \
        -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"version\": \"$SENTRY_RELEASE\",
            \"projects\": [\"imobibase\"],
            \"refs\": [{
                \"repository\": \"$(git config --get remote.origin.url)\",
                \"commit\": \"$SENTRY_RELEASE\"
            }]
        }" || log_warn "Sentry notification failed"
fi

# 9. Tag release
if [[ "$ENVIRONMENT" == "production" ]]; then
    log_info "Creating git tag..."
    VERSION="v$(date +"%Y.%m.%d-%H%M%S")"
    git tag -a "$VERSION" -m "Production release $VERSION"
    git push origin "$VERSION" || log_warn "Failed to push tag"
fi

# 10. Cleanup old backups (keep last 10)
if [[ -d "$BACKUP_DIR" ]]; then
    log_info "Cleaning up old backups..."
    ls -t "$BACKUP_DIR"/db_backup_*.sql 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
fi

log_info "================================"
log_info "Deployment to $ENVIRONMENT completed successfully!"
log_info "================================"
log_info "Deployed at: $(date)"
log_info "Commit: $(git rev-parse --short HEAD)"
log_info "Health check: $HEALTH_URL"

if [[ "$ENVIRONMENT" == "production" ]]; then
    log_info "Production URL: https://imobibase.com"
else
    log_info "Staging URL: https://staging-imobibase.vercel.app"
fi

exit 0
