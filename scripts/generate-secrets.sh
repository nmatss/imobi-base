#!/bin/bash

# ============================================
# ImobiBase - Security Secrets Generator
# ============================================
# This script generates cryptographically secure secrets
# for use in production environments.
#
# Usage: ./scripts/generate-secrets.sh
# Output: Copy the generated values to your .env file
# ============================================

set -e

echo "================================================"
echo "   ImobiBase Security Secrets Generator"
echo "================================================"
echo ""

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo "ERROR: openssl is not installed. Please install it first."
    echo "Ubuntu/Debian: sudo apt-get install openssl"
    echo "macOS: brew install openssl"
    exit 1
fi

echo "Generating cryptographically secure secrets..."
echo ""

# Generate SESSION_SECRET (64 bytes = 86 base64 characters)
SESSION_SECRET=$(openssl rand -base64 64 | tr -d '\n')

# Generate DATABASE_PASSWORD (32 bytes = 43 base64 characters)
DATABASE_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')

# Generate API_KEY (32 bytes for general API keys)
API_KEY=$(openssl rand -base64 32 | tr -d '\n')

# Generate JWT_SECRET (64 bytes for JWT signing)
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')

# Generate ENCRYPTION_KEY (32 bytes for AES-256)
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '\n')

# Generate WEBHOOK_SECRET (32 bytes for webhook verification)
WEBHOOK_SECRET=$(openssl rand -base64 32 | tr -d '\n')

echo "================================================"
echo "   GENERATED SECRETS - COPY TO YOUR .env FILE"
echo "================================================"
echo ""
echo "# ====== SESSION & AUTHENTICATION ======"
echo "SESSION_SECRET=$SESSION_SECRET"
echo ""
echo "# ====== DATABASE ======"
echo "# Use this for DATABASE_URL password:"
echo "# DATABASE_PASSWORD=$DATABASE_PASSWORD"
echo ""
echo "# ====== API & INTEGRATIONS ======"
echo "# General API Key (if needed):"
echo "# API_KEY=$API_KEY"
echo ""
echo "# ====== JWT SIGNING ======"
echo "# JWT_SECRET=$JWT_SECRET"
echo ""
echo "# ====== ENCRYPTION ======"
echo "# For encrypting sensitive data at rest:"
echo "# ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo ""
echo "# ====== WEBHOOK VERIFICATION ======"
echo "# For custom webhook endpoints:"
echo "# WEBHOOK_SECRET=$WEBHOOK_SECRET"
echo ""
echo "================================================"
echo "   SECURITY REMINDERS"
echo "================================================"
echo "1. NEVER commit these secrets to version control"
echo "2. Store these in a secure password manager"
echo "3. Use different secrets for each environment"
echo "4. Rotate secrets regularly (every 90 days)"
echo "5. Set proper file permissions: chmod 600 .env"
echo ""
echo "To save this output to a file:"
echo "  ./scripts/generate-secrets.sh > secrets.txt"
echo ""
echo "To set .env file permissions:"
echo "  chmod 600 .env"
echo "  chmod 600 .env.production"
echo ""
echo "================================================"
