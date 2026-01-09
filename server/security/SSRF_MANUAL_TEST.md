# SSRF Protection - Manual Testing Guide

## Quick Test Script

This guide shows how to manually test the SSRF protection implementation.

## Prerequisites

1. Server must be running: `npm run dev`
2. You must be authenticated (have a valid session)
3. Use a tool like `curl`, Postman, or HTTPie

---

## Test 1: Legitimate URL (Should PASS ✅)

### Valid WhatsApp Media URL
```bash
curl -X POST http://localhost:5000/api/whatsapp/send-media \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "phoneNumber": "+5511999999999",
    "mediaUrl": "https://lookaside.fbsbx.com/whatsapp_business/attachments/123/file.pdf",
    "caption": "Test document"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "messageId": "msg_123",
  "status": "queued"
}
```

---

## Test 2: AWS Metadata Attack (Should BLOCK ❌)

### Attempt to Access AWS Credentials
```bash
curl -X POST http://localhost:5000/api/whatsapp/send-media \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "phoneNumber": "+5511999999999",
    "mediaUrl": "http://169.254.169.254/latest/meta-data/iam/security-credentials/"
  }'
```

**Expected Response:**
```json
{
  "error": "Invalid media URL: Access to internal resources is forbidden"
}
```
**Status Code:** `400 Bad Request`

---

## Test 3: Private IP Attack (Should BLOCK ❌)

### Attempt to Access Internal Network
```bash
curl -X POST http://localhost:5000/api/whatsapp/send-media \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "phoneNumber": "+5511999999999",
    "mediaUrl": "http://192.168.1.1/admin"
  }'
```

**Expected Response:**
```json
{
  "error": "Invalid media URL: Access to private IP addresses is forbidden"
}
```
**Status Code:** `400 Bad Request`

---

## Test 4: Localhost Attack (Should BLOCK ❌)

### Attempt to Access Localhost Services
```bash
curl -X POST http://localhost:5000/api/whatsapp/send-media \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "phoneNumber": "+5511999999999",
    "mediaUrl": "http://localhost:3000/admin/users"
  }'
```

**Expected Response:**
```json
{
  "error": "Invalid media URL: Access to internal resources is forbidden"
}
```
**Status Code:** `400 Bad Request`

---

## Test 5: File Protocol Attack (Should BLOCK ❌)

### Attempt to Read Local Files
```bash
curl -X POST http://localhost:5000/api/whatsapp/send-media \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "phoneNumber": "+5511999999999",
    "mediaUrl": "file:///etc/passwd"
  }'
```

**Expected Response:**
```json
{
  "error": "Invalid media URL: Protocol file: not allowed. Only HTTP/HTTPS permitted."
}
```
**Status Code:** `400 Bad Request`

---

## Test 6: Loopback IP Attack (Should BLOCK ❌)

### Attempt to Use 127.0.0.1
```bash
curl -X POST http://localhost:5000/api/whatsapp/send-media \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "phoneNumber": "+5511999999999",
    "mediaUrl": "http://127.0.0.1:8080/api/internal"
  }'
```

**Expected Response:**
```json
{
  "error": "Invalid media URL: Access to internal resources is forbidden"
}
```
**Status Code:** `400 Bad Request`

---

## Test 7: GCP Metadata Attack (Should BLOCK ❌)

### Attempt to Access GCP Credentials
```bash
curl -X POST http://localhost:5000/api/whatsapp/send-media \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "phoneNumber": "+5511999999999",
    "mediaUrl": "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"
  }'
```

**Expected Response:**
```json
{
  "error": "Invalid media URL: Access to internal resources is forbidden"
}
```
**Status Code:** `400 Bad Request`

---

## Test 8: Valid S3 URL (Should PASS ✅)

### Legitimate AWS S3 Document
```bash
curl -X POST http://localhost:5000/api/whatsapp/send-media \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "phoneNumber": "+5511999999999",
    "mediaUrl": "https://s3.amazonaws.com/my-public-bucket/document.pdf",
    "caption": "Contract document"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "messageId": "msg_124",
  "status": "queued"
}
```

---

## Automated Test Script

Save this as `test-ssrf.sh`:

```bash
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:5000"
SESSION_COOKIE="YOUR_SESSION_COOKIE_HERE"

echo "🔒 SSRF Protection Test Suite"
echo "=============================="
echo ""

# Test function
test_url() {
    local test_name="$1"
    local media_url="$2"
    local should_block="$3"

    echo -n "Testing: $test_name... "

    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/whatsapp/send-media" \
      -H "Content-Type: application/json" \
      -H "Cookie: connect.sid=$SESSION_COOKIE" \
      -d "{
        \"phoneNumber\": \"+5511999999999\",
        \"mediaUrl\": \"$media_url\"
      }")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$should_block" = "true" ]; then
        if [ "$http_code" = "400" ]; then
            echo -e "${GREEN}✅ BLOCKED${NC}"
        else
            echo -e "${RED}❌ FAILED - Should be blocked but got $http_code${NC}"
            echo "  Response: $body"
        fi
    else
        if [ "$http_code" = "200" ]; then
            echo -e "${GREEN}✅ ALLOWED${NC}"
        else
            echo -e "${RED}❌ FAILED - Should be allowed but got $http_code${NC}"
            echo "  Response: $body"
        fi
    fi
}

# Run tests
echo "🔍 Malicious URL Tests (Should Block):"
test_url "AWS Metadata" "http://169.254.169.254/latest/meta-data/" true
test_url "Private IP 192.168" "http://192.168.1.1/admin" true
test_url "Private IP 10.x" "http://10.0.0.1/api" true
test_url "Localhost" "http://localhost/admin" true
test_url "127.0.0.1" "http://127.0.0.1:8080/api" true
test_url "File Protocol" "file:///etc/passwd" true
test_url "FTP Protocol" "ftp://internal.server/file.txt" true
test_url "GCP Metadata" "http://metadata.google.internal/computeMetadata" true

echo ""
echo "✅ Legitimate URL Tests (Should Allow):"
test_url "HTTPS URL" "https://example.com/file.pdf" false
test_url "HTTP URL" "http://example.com/image.jpg" false
test_url "S3 URL" "https://s3.amazonaws.com/bucket/file.pdf" false

echo ""
echo "=============================="
echo "✅ SSRF Protection Test Complete"
```

Make it executable and run:
```bash
chmod +x test-ssrf.sh
./test-ssrf.sh
```

---

## Monitoring Logs

While running tests, check the server logs for security events:

```bash
# Terminal 1: Run server with logs
npm run dev

# Terminal 2: Run tests
./test-ssrf.sh

# Expected log output (Terminal 1):
# [SECURITY] SSRF attempt blocked in WhatsApp media validation {
#   url: 'http://169.254.169.254/latest/meta-data/',
#   error: 'Access to internal resources is forbidden',
#   timestamp: '2025-12-26T15:42:00.000Z'
# }
```

---

## Verification Checklist

After running all tests:

- [ ] Legitimate URLs are allowed (return 200 OK)
- [ ] AWS metadata URLs are blocked (return 400)
- [ ] Private IP addresses are blocked (return 400)
- [ ] Localhost URLs are blocked (return 400)
- [ ] File protocol URLs are blocked (return 400)
- [ ] GCP metadata URLs are blocked (return 400)
- [ ] Server logs show security warnings for blocked attempts
- [ ] No false positives (legitimate URLs blocked)
- [ ] No false negatives (malicious URLs allowed)

---

## Troubleshooting

### Issue: All requests return 401 Unauthorized
**Solution:** Update the `SESSION_COOKIE` variable with a valid session cookie from your browser.

### Issue: Server not responding
**Solution:** Ensure the server is running with `npm run dev`.

### Issue: Tests show unexpected results
**Solution:**
1. Check server logs for detailed error messages
2. Verify the URL validator module is imported correctly
3. Ensure no middleware is bypassing the validation

---

## Security Notes

1. **Never disable SSRF protection** - This is a critical security feature
2. **Monitor security logs** - Set up alerts for repeated SSRF attempts
3. **Keep whitelist minimal** - Only add domains you absolutely trust
4. **Regular security audits** - Review and update the validator regularly
5. **Network-level protection** - Complement with firewall rules

---

## Additional Resources

- **Implementation Guide:** `server/security/SSRF_PROTECTION_GUIDE.md`
- **Test Suite:** `server/security/__tests__/url-validator.test.ts`
- **Validator Module:** `server/security/url-validator.ts`
- **OWASP SSRF:** https://owasp.org/www-community/attacks/Server_Side_Request_Forgery
