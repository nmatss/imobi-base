# SSRF Protection Guide

## Overview

This guide explains the Server-Side Request Forgery (SSRF) protection implemented in ImobiBase. SSRF is a critical security vulnerability where an attacker can force the server to make unauthorized requests to internal or external resources.

## Implementation

### Files Created/Modified

1. **Created: `/server/security/url-validator.ts`**
   - Core SSRF protection module
   - Validates external URLs before fetching
   - Blocks private IPs, localhost, and cloud metadata endpoints

2. **Modified: `/server/integrations/whatsapp/business-api.ts`**
   - Added URL validation in `downloadMedia()` method
   - Prevents SSRF attacks via WhatsApp media URLs

3. **Modified: `/server/routes-whatsapp.ts`**
   - Added URL validation in `/api/whatsapp/send-media` endpoint
   - Validates user-provided media URLs before queuing

4. **Modified: `/server/integrations/clicksign/document-service.ts`**
   - Added URL validation with domain whitelist
   - Protects document download endpoints

## Protection Features

### 1. Blocked Targets

The validator blocks access to:

- **Localhost**: `localhost`, `127.0.0.1`
- **Private IP Ranges**:
  - `10.0.0.0/8` (10.0.0.0 - 10.255.255.255)
  - `172.16.0.0/12` (172.16.0.0 - 172.31.255.255)
  - `192.168.0.0/16` (192.168.0.0 - 192.168.255.255)
- **Link-Local**: `169.254.0.0/16`
- **Loopback**: `127.0.0.0/8`
- **Cloud Metadata Endpoints**:
  - AWS: `169.254.169.254`
  - GCP: `metadata.google.internal`
  - AWS IPv6: `fd00:ec2::254`
- **Dangerous Protocols**: `file://`, `ftp://`

### 2. Allowed Protocols

Only the following protocols are permitted:
- `http://`
- `https://`

## Usage Examples

### Basic URL Validation

```typescript
import { validateExternalUrl } from '../security/url-validator';

// Valid URLs
const result1 = validateExternalUrl('https://example.com/file.pdf');
// { valid: true }

// Blocked - Private IP
const result2 = validateExternalUrl('http://192.168.1.1/file.pdf');
// { valid: false, error: 'Access to private IP addresses is forbidden' }

// Blocked - Localhost
const result3 = validateExternalUrl('http://localhost/admin');
// { valid: false, error: 'Access to internal resources is forbidden' }

// Blocked - Cloud metadata
const result4 = validateExternalUrl('http://169.254.169.254/latest/meta-data/');
// { valid: false, error: 'Access to internal resources is forbidden' }
```

### Whitelist Validation

For services that should only accept URLs from specific domains (like ClickSign):

```typescript
import { validateUrlWithWhitelist } from '../security/url-validator';

const CLICKSIGN_DOMAINS = [
  'api.clicksign.com',
  'clicksign.com',
  's3.amazonaws.com',
  'sandbox.clicksign.com',
];

// Allowed - Whitelisted domain
const result1 = validateUrlWithWhitelist(
  'https://api.clicksign.com/documents/123.pdf',
  CLICKSIGN_DOMAINS
);
// { valid: true }

// Blocked - Not in whitelist
const result2 = validateUrlWithWhitelist(
  'https://malicious.com/file.pdf',
  CLICKSIGN_DOMAINS
);
// { valid: false, error: 'Domain malicious.com is not in the allowed list' }
```

## Integration Examples

### WhatsApp Media Download

```typescript
// In business-api.ts
async downloadMedia(mediaUrl: string): Promise<Buffer> {
  // Validar URL antes de fazer download para prevenir SSRF
  const validation = validateExternalUrl(mediaUrl);
  if (!validation.valid) {
    throw new Error(`Invalid media URL: ${validation.error}`);
  }

  const response = await fetch(mediaUrl, {
    headers: {
      "Authorization": `Bearer ${this.config.apiToken}`,
    },
  });

  // ... rest of download logic
}
```

### API Endpoint Validation

```typescript
// In routes-whatsapp.ts
app.post("/api/whatsapp/send-media", async (req: Request, res: Response) => {
  const { phoneNumber, mediaUrl, caption, priority } = req.body;

  // Validar mediaUrl para prevenir SSRF
  const validation = validateExternalUrl(mediaUrl);
  if (!validation.valid) {
    return res.status(400).json({
      error: `Invalid media URL: ${validation.error}`,
    });
  }

  // ... rest of endpoint logic
});
```

### ClickSign Document Download

```typescript
// In document-service.ts
async downloadSignedDocument(documentKey: string): Promise<Buffer> {
  const document = await this.getDocument(documentKey);

  // SSRF Protection with domain whitelist
  this.validateDownloadUrl(document.downloads.signed_file_url, 'signed document download');

  const response = await fetch(document.downloads.signed_file_url);
  // ... rest of download logic
}
```

## Testing

Run the SSRF protection tests:

```bash
npm test -- server/security/__tests__/url-validator.test.ts
```

### Test Coverage

The test suite validates:
- ✅ Allows valid HTTP/HTTPS URLs
- ✅ Blocks localhost and 127.0.0.1
- ✅ Blocks all private IP ranges
- ✅ Blocks cloud metadata endpoints (AWS, GCP)
- ✅ Blocks dangerous protocols (file://, ftp://)
- ✅ Blocks link-local and multicast addresses
- ✅ Whitelist validation works correctly
- ✅ Real-world attack scenarios are prevented

## Attack Scenarios Prevented

### 1. Cloud Metadata Access
```bash
# Attacker tries to access AWS credentials
curl -X POST /api/whatsapp/send-media \
  -d '{"phoneNumber": "+5511999999999", "mediaUrl": "http://169.254.169.254/latest/meta-data/iam/security-credentials/"}'

# Response: 400 Bad Request
# Error: "Invalid media URL: Access to internal resources is forbidden"
```

### 2. Internal Port Scanning
```bash
# Attacker tries to scan internal services
curl -X POST /api/whatsapp/send-media \
  -d '{"phoneNumber": "+5511999999999", "mediaUrl": "http://192.168.1.100:8080/admin"}'

# Response: 400 Bad Request
# Error: "Invalid media URL: Access to private IP addresses is forbidden"
```

### 3. File System Access
```bash
# Attacker tries to read local files
curl -X POST /api/whatsapp/send-media \
  -d '{"phoneNumber": "+5511999999999", "mediaUrl": "file:///etc/passwd"}'

# Response: 400 Bad Request
# Error: "Invalid media URL: Protocol file: not allowed. Only HTTP/HTTPS permitted."
```

## Security Best Practices

### 1. Always Validate User-Provided URLs
```typescript
// ❌ DANGEROUS - Direct fetch without validation
async downloadFile(url: string) {
  return await fetch(url);
}

// ✅ SAFE - Validate before fetch
async downloadFile(url: string) {
  const validation = validateExternalUrl(url);
  if (!validation.valid) {
    throw new Error(`Invalid URL: ${validation.error}`);
  }
  return await fetch(url);
}
```

### 2. Use Whitelists for Known Services
```typescript
// ✅ SAFE - Restrict to specific domains
const ALLOWED_DOMAINS = ['api.trusted-service.com'];
const validation = validateUrlWithWhitelist(url, ALLOWED_DOMAINS);
```

### 3. Log Security Events
```typescript
if (!validation.valid) {
  console.warn('[SECURITY] SSRF attempt blocked', {
    url,
    error: validation.error,
    timestamp: new Date().toISOString(),
  });
  throw new Error(`Invalid URL: ${validation.error}`);
}
```

### 4. Follow Defense in Depth
- Network-level: Use firewalls to block outbound traffic to private IPs
- Application-level: Use this validator for all external URL requests
- Infrastructure-level: Run in isolated network segments

## Limitations and Future Improvements

### Current Limitations
1. **IPv6 Support**: Basic IPv6 validation not fully implemented
2. **DNS Rebinding**: Cannot prevent time-of-check-time-of-use attacks
3. **Redirect Following**: Does not validate redirect targets

### Recommended Improvements
1. Add IPv6 private address detection
2. Implement DNS resolution validation
3. Add HTTP redirect validation
4. Consider using a dedicated SSRF protection library
5. Implement request timeouts and size limits

## References

- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [CWE-918: Server-Side Request Forgery](https://cwe.mitre.org/data/definitions/918.html)
- [AWS IMDS Protection](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)

## Compliance

This implementation addresses:
- ✅ OWASP Top 10 - A10:2021 Server-Side Request Forgery
- ✅ CWE-918: Server-Side Request Forgery (SSRF)
- ✅ SANS Top 25 - CWE-918

## Support

For questions or security concerns, please contact the security team or create an issue in the project repository.
