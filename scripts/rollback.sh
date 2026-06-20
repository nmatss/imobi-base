#!/bin/bash

# ==================================
# ImobiBase Rollback Script
# ==================================
# Usage: ./scripts/rollback.sh [staging|production] [version]
# ==================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
VERSION=${2:-}
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

log_warn "================================"
log_warn "ROLLBACK to $ENVIRONMENT"
log_warn "================================"
log_warn "This will rollback the deployment!"
read -p "Are you sure you want to continue? (yes/no) " -r
echo
if [[ ! $REPLY =~ ^yes$ ]]; then
    log_info "Rollback cancelled."
    exit 0
fi

log_info "Starting rollback to $ENVIRONMENT..."

# 1. Rollback deployment
if command -v vercel &> /dev/null; then
    log_info "Rolling back Vercel deployment..."

    if [[ -z "$VERSION" ]]; then
        log_error "Vercel rollback requires an explicit deployment URL or deployment ID."
        log_error "Usage: ./scripts/rollback.sh $ENVIRONMENT <deployment-url-or-id>"
        exit 1
    fi

    # List recent deployments
    log_info "Recent deployments:"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        vercel ls --prod | head -n 10
    else
        vercel ls | head -n 10
    fi

    # Perform rollback
    log_info "Performing rollback to deployment: $VERSION"
    VERCEL_TOKEN_ARGS=()
    if [[ -n "${VERCEL_TOKEN:-}" ]]; then
        VERCEL_TOKEN_ARGS+=(--token="$VERCEL_TOKEN")
    fi

    vercel rollback "$VERSION" --yes "${VERCEL_TOKEN_ARGS[@]}" || {
        log_error "Vercel rollback failed!"
        exit 1
    }
fi

# 2. Docker rollback (if using Docker)
if [[ -f "docker-compose.yml" ]] && command -v docker &> /dev/null; then
    log_info "Rolling back Docker containers..."

    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD=(docker-compose)
    else
        COMPOSE_CMD=(docker compose)
    fi

    if [[ -n "$VERSION" ]]; then
        TARGET_IMAGE="$VERSION"
    else
        TARGET_IMAGE=$(docker images imobibase --format "{{.ID}}" | sed -n 2p)
    fi

    if [[ -z "$TARGET_IMAGE" ]]; then
        log_error "No previous Docker image found. Provide an explicit image tag or ID."
        exit 1
    fi

    docker image inspect "$TARGET_IMAGE" > /dev/null
    log_info "Rolling back to image: $TARGET_IMAGE"
    "${COMPOSE_CMD[@]}" down
    docker tag "$TARGET_IMAGE" imobibase:latest
    "${COMPOSE_CMD[@]}" up -d
fi

# 3. Restore database backup (optional)
if [[ -d "$BACKUP_DIR" ]]; then
    log_warn "Database backups available:"
    ls -lht "$BACKUP_DIR"/db_backup_*.sql 2>/dev/null | head -n 5 || log_info "No database backups found"

    read -p "Do you want to restore a database backup? (yes/no) " -r
    echo
    if [[ $REPLY =~ ^yes$ ]]; then
        read -p "Enter the backup filename: " BACKUP_FILE

        if [[ -f "$BACKUP_DIR/$BACKUP_FILE" ]]; then
            log_info "Restoring database from $BACKUP_FILE..."

            if command -v docker-compose &> /dev/null; then
                cat "$BACKUP_DIR/$BACKUP_FILE" | docker-compose exec -T postgres psql -U imobibase imobibase || {
                    log_error "Database restore failed!"
                    exit 1
                }
            else
                log_warn "Docker not available. Manual database restore required."
                log_info "Backup file: $BACKUP_DIR/$BACKUP_FILE"
            fi
        else
            log_error "Backup file not found: $BACKUP_DIR/$BACKUP_FILE"
        fi
    fi
fi

# 4. Health check
log_info "Performing health check..."
sleep 5  # Wait for rollback to stabilize

if [[ "$ENVIRONMENT" == "production" ]]; then
    HEALTH_URL="https://imobibase.com.br/api/health"
else
    HEALTH_URL="https://staging-imobibase.vercel.app/api/health"
fi

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

if [[ "$HTTP_STATUS" == "200" ]]; then
    log_info "Health check passed! (HTTP $HTTP_STATUS)"
else
    log_error "Health check failed! (HTTP $HTTP_STATUS)"
    log_error "Rollback may have issues. Please investigate immediately!"
    exit 1
fi

# 5. Notify team
log_info "================================"
log_info "Rollback to $ENVIRONMENT completed!"
log_info "================================"
log_info "Rolled back at: $(date)"
log_info "Current commit: $(git rev-parse --short HEAD)"
log_info "Health check: $HEALTH_URL"

if [[ "$ENVIRONMENT" == "production" ]]; then
    log_warn "PRODUCTION was rolled back. Please investigate the issue!"
    log_info "Production URL: https://imobibase.com.br"
else
    log_info "Staging URL: https://staging-imobibase.vercel.app"
fi

log_warn "Remember to:"
log_warn "1. Investigate what caused the need for rollback"
log_warn "2. Fix the issue before deploying again"
log_warn "3. Notify the team about the rollback"

exit 0
