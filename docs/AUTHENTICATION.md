# Authentication System Documentation

## Overview

This comprehensive authentication system provides secure user authentication with multiple features including password reset, email verification, OAuth integration (Google and Microsoft), session management, and advanced security monitoring.

## Table of Contents

1. [Architecture](#architecture)
2. [Features](#features)
3. [Database Schema](#database-schema)
4. [Server-Side Implementation](#server-side-implementation)
5. [Client-Side Implementation](#client-side-implementation)
6. [API Endpoints](#api-endpoints)
7. [Security Measures](#security-measures)
8. [Configuration](#configuration)
9. [Usage Examples](#usage-examples)

---

## Architecture

The authentication system is built with a modular architecture:

```
server/auth/
├── index.ts                    # Main entry point and route registration
├── password-reset.ts           # Password reset functionality
├── email-verification.ts       # Email verification flow
├── oauth-google.ts             # Google OAuth 2.0 integration
├── oauth-microsoft.ts          # Microsoft OAuth 2.0 integration
├── oauth-linking.ts            # Account linking for OAuth
├── session-manager.ts          # Session management and tracking
├── security.ts                 # Security features (lockout, monitoring)
└── email-service.ts            # Email templates and sending

client/src/
├── pages/auth/
│   ├── ForgotPassword.tsx      # Password reset request page
│   ├── ResetPassword.tsx       # Password reset completion page
│   └── VerifyEmail.tsx         # Email verification page
└── components/auth/
    └── OAuthButtons.tsx        # OAuth sign-in buttons
```

---

## Features

### 1. Password Reset Flow
- Secure token generation using cryptographic random bytes
- Token expiration (1 hour)
- Email-based reset link
- Password history tracking (prevents reuse of last 5 passwords)
- Rate limiting (3 requests per hour per email)
- Password strength validation

### 2. Email Verification
- Token-based email verification
- 24-hour token expiration
- Resend verification email functionality
- Rate limiting for resend requests

### 3. OAuth Integration
- **Google OAuth 2.0**
  - Sign in with Google
  - Automatic account creation
  - Token refresh support
- **Microsoft OAuth 2.0**
  - Sign in with Microsoft/Azure AD
  - Support for organizational and personal accounts
  - Token refresh support

### 4. Account Linking
- Link OAuth accounts to existing email accounts
- Unlink OAuth accounts
- Password requirement for unlinking
- Conflict resolution for duplicate emails

### 5. Session Management
- Device tracking (browser, OS, device type)
- IP address logging
- Location tracking (IP-based)
- Active session listing
- Individual session revocation
- Bulk session revocation
- Automatic session cleanup (30-day expiration)

### 6. Account Security
- **Account Lockout**: After 5 failed login attempts, account is locked for 30 minutes
- **Password Requirements**:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- **Password History**: Prevents reuse of last 5 passwords
- **Suspicious Activity Detection**: Flags logins from new IPs
- **Login History**: Complete audit trail of all login attempts
- **Security Alerts**: Email notifications for suspicious activity

---

## Database Schema

### Users Table Extensions

```typescript
export const users = sqliteTable("users", {
  // ... existing fields
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpires: text("verification_token_expires"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: text("password_reset_expires"),
  oauthProvider: text("oauth_provider"), // 'google', 'microsoft', null
  oauthId: text("oauth_id"),
  oauthAccessToken: text("oauth_access_token"),
  oauthRefreshToken: text("oauth_refresh_token"),
  lastLogin: text("last_login"),
  lastLoginIp: text("last_login_ip"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: text("locked_until"),
  passwordHistory: text("password_history"), // JSON array
});
```

### User Sessions Table

```typescript
export const userSessions = sqliteTable("user_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  sessionToken: text("session_token").notNull().unique(),
  deviceName: text("device_name"),
  deviceType: text("device_type"), // desktop, mobile, tablet
  browser: text("browser"),
  os: text("os"),
  ipAddress: text("ip_address"),
  location: text("location"),
  lastActivity: text("last_activity").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});
```

### Login History Table

```typescript
export const loginHistory = sqliteTable("login_history", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  email: text("email").notNull(),
  success: integer("success", { mode: "boolean" }).notNull(),
  failureReason: text("failure_reason"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  location: text("location"),
  suspicious: integer("suspicious", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull(),
});
```

---

## Server-Side Implementation

### Password Reset

```typescript
// Request password reset
POST /api/auth/forgot-password
Body: { email: string }

// Validate reset token
GET /api/auth/reset-token/:token

// Reset password
POST /api/auth/reset-password
Body: { token: string, password: string }
```

### Email Verification

```typescript
// Verify email
POST /api/auth/verify-email/:token

// Resend verification email
POST /api/auth/resend-verification
Body: { email: string }

// Check verification status
GET /api/auth/verification-status
```

### OAuth Routes

```typescript
// Google OAuth
GET /api/auth/google
GET /api/auth/google/callback

// Microsoft OAuth
GET /api/auth/microsoft
GET /api/auth/microsoft/callback

// OAuth Linking
POST /api/auth/oauth/link
Body: { provider: string, password?: string }

POST /api/auth/oauth/unlink
Body: { password?: string, newPassword?: string }

GET /api/auth/oauth/status
```

### Session Management

```typescript
// Get all active sessions
GET /api/auth/sessions

// Revoke specific session
DELETE /api/auth/sessions/:sessionId

// Revoke all sessions
DELETE /api/auth/sessions/all
Body: { keepCurrent?: boolean }

// Get session count
GET /api/auth/sessions/count
```

### Security Routes

```typescript
// Get password requirements
GET /api/auth/security/password-requirements

// Validate password strength
POST /api/auth/security/validate-password
Body: { password: string }

// Get login history
GET /api/auth/security/login-history?limit=20

// Get security status
GET /api/auth/security/status
```

---

## Client-Side Implementation

### Password Reset Flow

```tsx
// 1. Request password reset
<ForgotPassword />
// User enters email, receives reset link

// 2. Reset password
<ResetPassword />
// User clicks link, enters new password with strength indicator
```

### Email Verification

```tsx
<VerifyEmail />
// Automatic verification when user clicks link from email
```

### OAuth Integration

```tsx
import { OAuthButtons } from "@/components/auth/OAuthButtons";

// In your login page
<OAuthButtons action="login" />

// In your signup page
<OAuthButtons action="signup" />

// In settings for account linking
<OAuthButtons action="link" />
```

---

## API Endpoints

### Complete Endpoint List

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/forgot-password` | Request password reset | No |
| GET | `/api/auth/reset-token/:token` | Validate reset token | No |
| POST | `/api/auth/reset-password` | Complete password reset | No |
| POST | `/api/auth/verify-email/:token` | Verify email address | No |
| POST | `/api/auth/resend-verification` | Resend verification email | No |
| GET | `/api/auth/verification-status` | Check verification status | Yes |
| GET | `/api/auth/google` | Initiate Google OAuth | No |
| GET | `/api/auth/google/callback` | Google OAuth callback | No |
| GET | `/api/auth/microsoft` | Initiate Microsoft OAuth | No |
| GET | `/api/auth/microsoft/callback` | Microsoft OAuth callback | No |
| POST | `/api/auth/oauth/link` | Link OAuth account | Yes |
| POST | `/api/auth/oauth/unlink` | Unlink OAuth account | Yes |
| GET | `/api/auth/oauth/status` | Get OAuth link status | Yes |
| GET | `/api/auth/sessions` | List active sessions | Yes |
| DELETE | `/api/auth/sessions/:id` | Revoke session | Yes |
| DELETE | `/api/auth/sessions/all` | Revoke all sessions | Yes |
| GET | `/api/auth/sessions/count` | Get session count | Yes |
| GET | `/api/auth/security/password-requirements` | Get password requirements | No |
| POST | `/api/auth/security/validate-password` | Validate password strength | No |
| GET | `/api/auth/security/login-history` | Get login history | Yes |
| GET | `/api/auth/security/status` | Get security status | Yes |

---

## Security Measures

### Token Generation
- Uses `crypto.randomBytes(32)` for cryptographically secure tokens
- Tokens are hashed with SHA-256 before storage
- Expiration times enforced at database level

### Rate Limiting
- Password reset requests: 3 per hour per email
- Email verification resend: 3 per hour per email
- 2FA validation: 5 attempts per 15 minutes

### Password Security
- Bcrypt hashing with 10 salt rounds
- Password history tracking (last 5 passwords)
- Strength validation before acceptance
- Common password checking (can be enhanced)

### Account Lockout
- 5 failed login attempts triggers 30-minute lockout
- Automatic unlock after lockout period
- Failed attempts reset on successful login

### Session Security
- Session tokens hashed before storage
- 30-day session expiration
- Device and IP tracking
- Automatic cleanup of expired sessions

### OAuth Security
- State parameter validation (CSRF protection)
- Token storage encrypted
- Refresh token support
- Secure redirect handling

---

## Configuration

### Environment Variables

```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@imobibase.com

# Application URL
APP_URL=http://localhost:5000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_REDIRECT_URI=http://localhost:5000/api/auth/microsoft/callback
MICROSOFT_TENANT=common  # or 'organizations', 'consumers', or specific tenant ID
```

### OAuth Setup

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs
6. Copy Client ID and Client Secret

#### Microsoft OAuth Setup
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory > App registrations
3. Create new registration
4. Add redirect URIs
5. Create client secret under "Certificates & secrets"
6. Copy Application (client) ID and client secret

---

## Usage Examples

### Password Reset Flow

```typescript
// 1. User requests password reset
const handleForgotPassword = async (email: string) => {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  // User receives email with reset link
};

// 2. User completes password reset
const handleResetPassword = async (token: string, password: string) => {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password })
  });
};
```

### Email Verification

```typescript
// Send verification email during registration
import { sendVerificationTokenToUser } from './auth/email-verification';

await sendVerificationTokenToUser(userId, email, name);

// Verify email when user clicks link
const handleVerifyEmail = async (token: string) => {
  const response = await fetch(`/api/auth/verify-email/${token}`, {
    method: 'POST'
  });
};
```

### Session Management

```typescript
// Get user's active sessions
const getSessions = async () => {
  const response = await fetch('/api/auth/sessions');
  const { sessions } = await response.json();
  return sessions;
};

// Revoke a specific session
const revokeSession = async (sessionId: string) => {
  await fetch(`/api/auth/sessions/${sessionId}`, {
    method: 'DELETE'
  });
};

// Revoke all other sessions
const revokeAllOtherSessions = async () => {
  await fetch('/api/auth/sessions/all', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keepCurrent: true })
  });
};
```

### Login with Security Checks

```typescript
import {
  handleFailedLogin,
  handleSuccessfulLogin,
  checkAccountLock
} from './auth/security';

const login = async (email: string, password: string, req: Request) => {
  // Check if account is locked
  const lockStatus = await checkAccountLock(userId);
  if (lockStatus.locked) {
    return {
      error: 'Account locked',
      lockedUntil: lockStatus.lockedUntil,
      remainingTime: lockStatus.remainingTime
    };
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    const result = await handleFailedLogin(
      userId,
      email,
      'invalid_password',
      req
    );
    return {
      error: 'Invalid password',
      remainingAttempts: result.remainingAttempts
    };
  }

  // Successful login
  const { suspicious } = await handleSuccessfulLogin(userId, email, req);

  return {
    success: true,
    suspicious,
    user
  };
};
```

---

## Email Templates

The system includes professionally designed HTML email templates for:

1. **Password Reset** (`sendPasswordResetEmail`)
   - Clean, responsive design
   - Clear call-to-action button
   - Expiration notice
   - Alternative text link

2. **Email Verification** (`sendVerificationEmail`)
   - Welcome message
   - Verification button
   - 24-hour expiration notice

3. **Password Changed Confirmation** (`sendPasswordChangedEmail`)
   - Confirmation of password change
   - Security recommendations
   - Login button

4. **Security Alert** (`sendSecurityAlertEmail`)
   - Suspicious activity notification
   - Action details (location, device, IP)
   - Change password button

5. **New Login Notification** (`sendNewLoginEmail`)
   - New device/location notification
   - Login details
   - Review activity button

---

## Security Best Practices

### For Developers

1. **Never log sensitive data**: Passwords, tokens, and secrets should never be logged
2. **Use environment variables**: Keep all secrets in `.env` files
3. **Validate all inputs**: Always validate and sanitize user inputs
4. **Use HTTPS**: Always use HTTPS in production
5. **Keep dependencies updated**: Regularly update npm packages
6. **Implement CSRF protection**: Use state parameters for OAuth
7. **Rate limit endpoints**: Prevent brute force attacks

### For Users

1. **Use strong passwords**: Follow the password requirements
2. **Enable 2FA**: Add an extra layer of security
3. **Review active sessions**: Regularly check and revoke unknown sessions
4. **Monitor login history**: Check for suspicious activity
5. **Keep email secure**: Email is used for password reset
6. **Don't reuse passwords**: Each account should have a unique password

---

## Troubleshooting

### Common Issues

**Email not sending**
- Check EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD
- Verify SMTP credentials
- Check spam folder
- Enable "Less secure app access" for Gmail (or use App Password)

**OAuth redirect error**
- Verify redirect URIs match exactly in OAuth provider settings
- Check GOOGLE_REDIRECT_URI and MICROSOFT_REDIRECT_URI
- Ensure URLs are accessible from the internet (for production)

**Session expired immediately**
- Check system time is correct
- Verify session expiration calculation
- Check database timezone settings

**Account locked permanently**
- Check `lockedUntil` timestamp in database
- Manually unlock: `UPDATE users SET lockedUntil = NULL WHERE id = ?`
- Verify system time is correct

---

## Migration Guide

### Adding to Existing Project

1. **Update database schema**:
   ```bash
   npm run db:push  # or your migration command
   ```

2. **Install dependencies**:
   ```bash
   npm install nodemailer axios ua-parser-js
   npm install --save-dev @types/nodemailer @types/ua-parser-js
   ```

3. **Configure environment variables** (see Configuration section)

4. **Register routes** in `server/index.ts`:
   ```typescript
   import { registerAuthenticationRoutes } from "./auth";
   registerAuthenticationRoutes(app);
   ```

5. **Add client routes** in your router:
   ```tsx
   <Route path="/auth/forgot-password" element={<ForgotPassword />} />
   <Route path="/auth/reset-password" element={<ResetPassword />} />
   <Route path="/auth/verify-email" element={<VerifyEmail />} />
   ```

---

## Future Enhancements

Planned features for future releases:

- [ ] WebAuthn/Passkeys support
- [ ] SMS verification
- [ ] IP geolocation for location tracking
- [ ] Biometric authentication
- [ ] Magic link authentication
- [ ] Social login (GitHub, Facebook, Twitter)
- [ ] Advanced password policies (expiration, complexity rules)
- [ ] Account recovery questions
- [ ] Device trust management
- [ ] Risk-based authentication

---

## Support and Documentation

For additional help:
- Check the inline code comments
- Review the audit logs for debugging
- Monitor login history for security issues
- Test in development before deploying to production

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintained by**: Agent 9 - Authentication Engineer
