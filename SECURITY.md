# Security Policy

## Reporting a Vulnerability

The ImobiBase team takes security bugs seriously. We appreciate your efforts to responsibly disclose your findings.

### How to Report a Security Vulnerability

**Please DO NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:
- **security@imobibase.com**

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

This information will help us triage your report more quickly.

## Responsible Disclosure Policy

We follow a coordinated vulnerability disclosure policy:

1. **Report**: Submit your findings via security@imobibase.com
2. **Acknowledgment**: We'll acknowledge receipt within 48 hours
3. **Assessment**: We'll assess the vulnerability and severity within 5 business days
4. **Fix Development**: We'll develop a fix based on severity:
   - Critical: Within 24-48 hours
   - High: Within 7 days
   - Medium: Within 30 days
   - Low: Within 90 days
5. **Public Disclosure**: After the fix is deployed, we'll publicly disclose the vulnerability (90 days from initial report)

## Security Bounty Program

We currently do not have a formal bug bounty program. However, we appreciate security researchers who report vulnerabilities responsibly and will acknowledge your contribution in our security advisories (with your permission).

## Supported Versions

We release patches for security vulnerabilities based on the following schedule:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

We recommend all users stay up to date with the latest stable release.

## Security Update Policy

### Critical Security Updates
- Released immediately upon discovery
- All users notified via email
- Automatic deployment to cloud-hosted instances

### High Priority Updates
- Released within 7 days
- Announced in release notes
- Deployment recommended within 24 hours

### Standard Security Updates
- Included in regular release cycle
- Announced in release notes
- Deployment recommended within 30 days

## Security Features

ImobiBase implements multiple layers of security:

### Authentication & Authorization
- Strong password requirements (min 8 chars, uppercase, lowercase, number, special char)
- Password hashing using scrypt with random salt
- Two-factor authentication (2FA/TOTP) support
- OAuth integration (Google, Microsoft)
- Account lockout after 5 failed login attempts
- Session management with secure cookies
- Role-based access control (RBAC)

### Data Protection
- HTTPS/TLS encryption for all data in transit
- Secure session cookies (HttpOnly, Secure, SameSite)
- Multi-tenant data isolation
- Audit logging for all sensitive operations
- LGPD/GDPR compliance features

### Attack Prevention
- SQL injection protection via parameterized queries (Drizzle ORM)
- XSS protection with input sanitization
- CSRF protection with token validation
- Rate limiting on all API endpoints
- Brute force protection
- Intrusion detection system
- Automated blocking of malicious IPs

### Infrastructure Security
- Security headers (Helmet.js)
  - **Content Security Policy (CSP)** with nonce-based inline script protection
    - Removed 'unsafe-inline' and 'unsafe-eval' from scriptSrc
    - Unique nonce generated per request
    - Supports modern CSP Level 3 standards
  - X-Frame-Options (frameAncestors: none)
  - X-Content-Type-Options (noSniff)
  - Strict-Transport-Security (HSTS) with 1-year max-age
  - Referrer-Policy: strict-origin-when-cross-origin
- File upload validation
  - MIME type checking
  - File size limits
  - Filename sanitization
  - Malware scanning (TODO)
- Regular dependency updates
- Automated security scanning
- **Pre-deployment security checklist** - See [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)

## Security Best Practices for Users

### For Administrators
1. **Enable Two-Factor Authentication** on all admin accounts
2. **Use Strong Passwords** (at least 12 characters)
3. **Regularly Review** audit logs and user permissions
4. **Update** to the latest version promptly
5. **Backup** your data regularly
6. **Monitor** security alerts and notifications
7. **Limit** administrative access to necessary personnel only

### For Developers
1. **Review** the [Security Documentation](./docs/SECURITY_AUDIT.md)
2. **Complete** the [Pre-Deployment Security Checklist](./SECURITY_CHECKLIST.md) before every production deployment
3. **Follow** secure coding practices
4. **Validate** all user inputs
5. **Use** parameterized queries for database operations
6. **Sanitize** output to prevent XSS
7. **Never commit** `.env` files or secrets to version control
8. **Generate secrets** using `./scripts/generate-secrets.sh` for production
9. **Test** security features before deployment
10. **Report** security issues immediately

## Compliance

ImobiBase is designed to comply with:

- **LGPD** (Lei Geral de Proteção de Dados - Brazil)
- **GDPR** (General Data Protection Regulation - EU)
- **OWASP Top 10** security standards
- **SOC 2** security framework (in progress)

## Security Audits

- **Last Internal Audit**: December 2025
- **Last External Audit**: Not yet conducted
- **Next Scheduled Audit**: June 2026

We conduct regular security audits and penetration testing. If you're interested in conducting a security assessment, please contact security@imobibase.com.

## Security Contacts

- **Security Team**: security@imobibase.com
- **Data Protection Officer**: dpo@imobibase.com
- **Incident Response**: incident@imobibase.com

## Hall of Fame

We recognize security researchers who have helped improve ImobiBase security:

*No submissions yet - be the first!*

## Learn More

- [Pre-Deployment Security Checklist](./SECURITY_CHECKLIST.md) - **START HERE before deploying**
- [Security Audit Report](./docs/SECURITY_AUDIT.md)
- [Development Documentation](./docs/)
- [API Documentation](./docs/API.md)
- [Secrets Generation Script](./scripts/generate-secrets.sh)

---

**Last Updated**: December 24, 2025
