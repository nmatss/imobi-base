# Deliverable 7: Security/Auth Audit Checklist

> ImobiBase -- Operational Security Testing Checklist
> Generated: 2026-03-15 | Based on source code analysis of actual auth implementation

---

## 1. Main Auth (Session-Based -- Passport.js + express-session)

Source files: `server/routes.ts`, `server/auth/security.ts`, `server/auth/session-manager.ts`

| # | Test Name | Type | Severity | Test Approach |
|---|-----------|------|----------|---------------|
| MA-01 | Valid login creates session | auto | BLOCKER | POST `/api/login` with valid credentials, assert 200 + `set-cookie` header contains session ID |
| MA-02 | Invalid password returns 401 | auto | BLOCKER | POST `/api/login` with wrong password, assert 401 + no `set-cookie` + `handleFailedLogin()` increments counter |
| MA-03 | Missing email returns 400 | auto | HIGH | POST `/api/login` with empty email, assert 400 + descriptive error |
| MA-04 | Missing password returns 400 | auto | HIGH | POST `/api/login` with empty password, assert 400 + descriptive error |
| MA-05 | Expired session returns 401 | auto | BLOCKER | Create session, advance time past `SESSION_EXPIRY_DAYS` (30d), call protected route, assert 401 |
| MA-06 | Session fixation prevented | auto | CRITICAL | Record session ID before login, login, verify session ID changed (Passport `regenerate`) |
| MA-07 | CSRF token required on POST/PUT/DELETE | auto | CRITICAL | POST to protected route without `x-csrf-token` header, assert 403 from `csrfProtection` middleware |
| MA-08 | CSRF token validates correctly | auto | CRITICAL | GET `/api/csrf-token`, use returned token in subsequent POST, assert request succeeds |
| MA-09 | CSRF skipped for webhook paths | auto | HIGH | POST to `/api/webhooks/stripe` without CSRF, assert NOT 403 (whitelisted in `csrf-protection.ts` line 149-157) |
| MA-10 | OAuth Google: redirect to Google | manual | HIGH | GET `/api/auth/google`, verify redirect to `accounts.google.com` with correct scopes |
| MA-11 | OAuth Google: callback creates session | manual | HIGH | Complete Google flow, verify session created and user record linked via `oauthProvider` |
| MA-12 | OAuth Microsoft: redirect to Microsoft | manual | HIGH | GET `/api/auth/microsoft`, verify redirect to `login.microsoftonline.com` |
| MA-13 | OAuth Microsoft: callback creates session | manual | HIGH | Complete Microsoft flow, verify session + user linked |
| MA-14 | OAuth account linking | auto | HIGH | Authenticated user links Google account via `/api/auth/link/google`, verify `oauthProvider` updated |
| MA-15 | 2FA TOTP setup returns secret + QR | auto | CRITICAL | POST `/api/auth/2fa/setup` while authenticated, assert response contains `secret`, `otpauthUrl`, `backupCodes` (10 codes) |
| MA-16 | 2FA TOTP verify enables 2FA | auto | CRITICAL | After setup, POST `/api/auth/2fa/verify` with valid TOTP from `verifyTOTP()`, assert `isEnabled=true` |
| MA-17 | 2FA TOTP invalid code rejected | auto | CRITICAL | POST `/api/auth/2fa/verify` with `000000`, assert 400 + remaining attempts decremented |
| MA-18 | 2FA backup code works | auto | CRITICAL | POST `/api/auth/2fa/validate` with valid backup code, assert `valid=true` + code consumed (removed from `backupCodes` array) |
| MA-19 | 2FA rate limit enforced (5 attempts/15min) | auto | CRITICAL | Send 6 invalid TOTP codes to `/api/auth/2fa/verify`, assert 429 on 6th attempt (`RATE_LIMIT_MAX_ATTEMPTS=5`) |
| MA-20 | 2FA disable requires code | auto | HIGH | POST `/api/auth/2fa/disable` without token/backupCode, assert 400 |
| MA-21 | Password reset: request always 200 | auto | HIGH | POST `/api/auth/forgot-password` with unknown email, assert 200 (prevents email enumeration, confirmed in `password-reset.ts`) |
| MA-22 | Password reset: valid token changes password | auto | BLOCKER | Generate reset token, POST `/api/auth/reset-password` with token + new password, assert success |
| MA-23 | Password reset: expired token rejected | auto | HIGH | Use token after expiry window, assert 400/401 |
| MA-24 | Email verification flow | auto | HIGH | Register user, verify `sendVerificationTokenToUser()` called, GET verify endpoint with token, assert `emailVerified=true` |
| MA-25 | Account lockout after 5 failures | auto | CRITICAL | Call `handleFailedLogin()` 5 times for same user (`MAX_FAILED_ATTEMPTS=5`), assert `lockedUntil` set to 30min from now |
| MA-26 | Locked account rejects login | auto | CRITICAL | Lock account, attempt login, assert 401/423 + `lockedUntil` in response |
| MA-27 | Account auto-unlocks after 30min | auto | HIGH | Lock account, advance time 31min, call `checkAccountLock()`, assert `locked=false` + `failedLoginAttempts` reset to 0 |
| MA-28 | Suspicious login detection | auto | HIGH | Login from new IP, verify `handleSuccessfulLogin()` returns `suspicious=true` + `sendNewLoginEmail()` called |
| MA-29 | Password strength validation | auto | HIGH | POST `/api/auth/security/validate-password` with weak password, assert `valid=false` + missing requirements listed |
| MA-30 | Password history prevents reuse | auto | HIGH | Change password, attempt to reuse old password, assert `checkPasswordHistory()` returns `false` (checks last 5) |
| MA-31 | Session revocation | auto | HIGH | DELETE `/api/auth/sessions/:id`, assert session deleted and subsequent requests with that session return 401 |
| MA-32 | Revoke all sessions | auto | HIGH | DELETE `/api/auth/sessions/all`, assert all sessions for user removed except current (if `keepCurrent=true`) |

---

## 2. Portal Auth (JWT-Based)

Source file: `server/routes-portal.ts`

| # | Test Name | Type | Severity | Test Approach |
|---|-----------|------|----------|---------------|
| PA-01 | Valid portal login returns JWT | auto | BLOCKER | POST `/api/portal/login` with valid credentials, assert 200 + `token` in body + JWT decodes to `PortalUser` shape |
| PA-02 | Invalid credentials returns 401 | auto | BLOCKER | POST `/api/portal/login` with wrong password, assert 401 + generic error "Email ou senha incorretos" |
| PA-03 | Inactive account returns 401 | auto | CRITICAL | Set `isActive=false` on portal access, attempt login, assert 401 |
| PA-04 | Missing password hash returns 401 | auto | HIGH | Portal access with null `passwordHash`, login attempt, assert 401 with "Senha nao configurada" message |
| PA-05 | Expired JWT returns 401 | auto | BLOCKER | Generate JWT with expired `PORTAL_JWT_EXPIRY`, use in Authorization header, assert 401 "Token invalido ou expirado" |
| PA-06 | Tampered JWT returns 401 | auto | BLOCKER | Modify JWT payload (change `clientId`), send to `requirePortalAuth`, assert 401 (signature verification fails) |
| PA-07 | JWT signed with wrong secret returns 401 | auto | CRITICAL | Sign JWT with different secret than `PORTAL_JWT_SECRET`, send to protected endpoint, assert 401 |
| PA-08 | Token for wrong user type returns 403 | auto | CRITICAL | Create owner JWT, access `/api/portal/renter/dashboard` (guarded by `requirePortalType("renter")`), assert 403 |
| PA-09 | Missing Authorization header returns 401 | auto | BLOCKER | GET `/api/portal/me` without header, assert 401 |
| PA-10 | Malformed Authorization header returns 401 | auto | HIGH | Send `Authorization: Token xyz` (not "Bearer"), assert 401 |
| PA-11 | **Brute force protection MISSING** | manual | BLOCKER | **FINDING**: `/api/portal/login` has NO rate limiting -- verify by sending 100 rapid login attempts; all should be processed. **REMEDIATION REQUIRED**: Add `express-rate-limit` to portal login endpoint |
| PA-12 | Portal forgot-password prevents enumeration | auto | HIGH | POST `/api/portal/forgot-password` with unknown email, assert 200 with generic message (confirmed line 166) |
| PA-13 | Login count incremented | auto | LOW | Login successfully, verify `loginCount` incremented and `lastLogin` updated |
| PA-14 | Default JWT secret is not used in production | manual | BLOCKER | **FINDING**: `PORTAL_JWT_SECRET` defaults to `"portal-secret-key-change-in-production"` (line 17). Verify `PORTAL_JWT_SECRET` env var is set in production deployment |

---

## 3. Authorization

Source files: `server/middleware/auth.ts`, `server/routes-portal.ts`

| # | Test Name | Type | Severity | Test Approach |
|---|-----------|------|----------|---------------|
| AZ-01 | Regular user blocked from admin routes | auto | BLOCKER | Login as `role=user`, GET admin-only endpoint (guarded by `requireAdmin`), assert 403 "Admin privileges required" |
| AZ-02 | Admin can access admin routes | auto | BLOCKER | Login as `role=admin`, access admin endpoint, assert 200 |
| AZ-03 | Super admin can access admin routes | auto | HIGH | Login as `role=super_admin`, access admin endpoint, assert 200 (both roles accepted in `requireAdmin`) |
| AZ-04 | Admin blocked from super_admin routes | auto | CRITICAL | Login as `role=admin`, access super-admin endpoint (guarded by `requireSuperAdmin`), assert 403 |
| AZ-05 | Portal owner cannot access renter endpoints | auto | CRITICAL | Use owner JWT, GET `/api/portal/renter/dashboard`, assert 403 from `requirePortalType("renter")` |
| AZ-06 | Portal renter cannot access owner endpoints | auto | CRITICAL | Use renter JWT, GET `/api/portal/owner/dashboard`, assert 403 from `requirePortalType("owner")` |
| AZ-07 | Cross-tenant access blocked (main system) | auto | BLOCKER | User from tenant A tries to access property from tenant B, assert data not returned (enforced by `tenantId` filter in storage layer) |
| AZ-08 | Cross-tenant access blocked (portal) | auto | BLOCKER | Portal user with `tenantId=A`, access data belonging to `tenantId=B`, assert 404 or empty result |
| AZ-09 | Missing tenantId returns 403 | auto | CRITICAL | Authenticate user without `tenantId`, access protected route, assert 403 "Invalid user session" (line 29 of `auth.ts`) |
| AZ-10 | Portal admin management requires session auth | auto | CRITICAL | Access `/api/portal/admin/access` without main system session (only JWT), assert 401 (uses `requireAuth` from middleware) |
| AZ-11 | Portal owner can only see own transfers | auto | CRITICAL | Owner A accesses `/api/portal/owner/repasses/:id` for transfer belonging to Owner B, assert 404 (line 356 checks `ownerId`) |
| AZ-12 | Portal renter can only see own payments | auto | CRITICAL | Renter A accesses `/api/portal/renter/payments/:id/boleto` for payment of Renter B, assert 403 (line 607 checks `renterId`) |
| AZ-13 | Portal maintenance ticket ownership | auto | HIGH | Renter A tries to update maintenance ticket of Renter B via PUT `/api/portal/renter/maintenance/:id`, assert 404 (line 782 checks `requestedById`) |

---

## 4. Privilege Escalation

| # | Test Name | Type | Severity | Test Approach |
|---|-----------|------|----------|---------------|
| PE-01 | User cannot change own role via API | auto | BLOCKER | PUT `/api/users/:id` with `{role: "admin"}` as regular user, assert role unchanged in DB |
| PE-02 | User cannot access other users' data | auto | BLOCKER | GET `/api/users/:otherId` as non-admin, assert 403 or filtered response |
| PE-03 | Portal user cannot access main system | auto | BLOCKER | Use portal JWT on main system endpoints (e.g., GET `/api/properties`), assert 401 (different auth middleware) |
| PE-04 | Regular user cannot create admin accounts | auto | CRITICAL | POST `/api/register` with `role=admin` as non-admin, assert role ignored or rejected |
| PE-05 | Portal admin access scoped to own tenant | auto | CRITICAL | Admin of Tenant A tries to create portal access for client of Tenant B via POST `/api/portal/admin/access`, assert 404 (line 864 checks `tenantId`) |
| PE-06 | Cannot forge tenantId in requests | auto | BLOCKER | Send request with `tenantId` in body different from session's `tenantId`, assert server uses session value not body value |
| PE-07 | IDOR on maintenance ticket approval | auto | CRITICAL | Owner A tries to approve ticket for Owner B's property via PUT `/api/portal/owner/maintenance/:id/approve`, assert 403 (line 429 cross-checks property ownership) |
| PE-08 | Cannot escalate portal access type | auto | HIGH | Owner tries to modify own portal access to change `clientType` to "renter" or vice versa |

---

## Critical Security Findings from Code Review

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| **Default JWT secret in production** | BLOCKER | `routes-portal.ts:17` | `PORTAL_JWT_SECRET` falls back to hardcoded string if env var missing |
| **No brute force on portal login** | BLOCKER | `routes-portal.ts:71` | `/api/portal/login` has no rate limiting (main auth has lockout but portal does not) |
| **In-memory CSRF store** | HIGH | `csrf-protection.ts:16` | CSRF tokens stored in `Map` -- lost on restart, not shared across instances |
| **In-memory 2FA rate limiter** | HIGH | `routes-security.ts:193` | Rate limit state in `Map` -- not shared across instances in multi-process deployment |
| **2FA validate endpoint unauthenticated** | CRITICAL | `routes-security.ts:452` | `/api/auth/2fa/validate` accepts `userId` from body without auth -- could be used to enumerate 2FA status |
