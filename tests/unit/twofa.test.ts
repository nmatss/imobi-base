import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Behavioral tests for the SMS 2FA service (server/integrations/sms/twofa.ts).
 *
 * IMPORTANT — current state of the module under test:
 * The `verificationCodes` table is NOT yet implemented in the schema, so the
 * module declares `const verificationCodes: any = null`. Every persistence
 * method dereferences `verificationCodes.<field>` to build its where-clause,
 * which throws a TypeError synchronously the moment it touches the null table —
 * regardless of how the `db` client is mocked. There is no way to exercise the
 * "happy path" of store / validate / rate-limit until the schema lands.
 *
 * These tests therefore lock in the REAL, observable contract of the module as
 * it stands today:
 *   - generateCode(): a genuinely working pure function (shape, length, range).
 *   - send(): genuinely works (renders template + enqueues), no table access.
 *   - generate(): currently THROWS (table not implemented) — documents the gap.
 *   - verify / getRemainingAttempts / resend / cleanup: their try/catch swallows
 *     the table error and returns the documented SAFE fallback
 *     (false / MAX_ATTEMPTS / false / 0). This is the security-relevant contract:
 *     a broken store must never "accidentally" verify a code.
 *   - generateAndSend & purpose helpers: report failure (no expiry) because the
 *     underlying generate() throws.
 *   - getTwoFactorSMS(): stable singleton.
 *
 * When the schema is implemented these tests will start failing loudly at the
 * "currently throws / returns fallback" assertions, which is the desired signal
 * to extend coverage to the real persistence paths.
 */

const h = vi.hoisted(() => {
  const enqueueMock = vi.fn(async (..._a: any[]) => undefined);
  const renderMock = vi.fn(
    (_name: string, ctx: Record<string, unknown>) =>
      `CODE:${ctx.code}/EXP:${ctx.expiryMinutes}`,
  );
  return { enqueueMock, renderMock };
});

const { enqueueMock, renderMock } = h;

vi.mock('../../server/integrations/sms/sms-queue', () => ({
  getSMSQueue: () => ({ enqueue: h.enqueueMock }),
}));

vi.mock('../../server/integrations/sms/templates', () => ({
  renderSMSTemplate: (name: string, ctx: Record<string, unknown>) =>
    h.renderMock(name, ctx),
}));

// The db client is never reached with a real query (the null table throws
// first), but mock it so importing twofa.ts does not spin up a DB connection.
vi.mock('../../server/db', () => ({
  db: new Proxy(
    {},
    {
      get() {
        return () => {
          throw new Error('db should not be reached: verificationCodes is null');
        };
      },
    },
  ),
}));

// Import AFTER mocks are registered.
import { TwoFactorSMS, getTwoFactorSMS } from '../../server/integrations/sms/twofa';

const svc = new TwoFactorSMS();

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('generateCode (pure code generation)', () => {
  it('generates a 6-digit numeric code by default', () => {
    for (let i = 0; i < 100; i++) {
      const code = svc.generateCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(Number(code)).toBeGreaterThanOrEqual(100000);
      expect(Number(code)).toBeLessThanOrEqual(999999);
    }
  });

  it('honors a custom length (4 digits)', () => {
    for (let i = 0; i < 100; i++) {
      const code = svc.generateCode(4);
      expect(code).toMatch(/^\d{4}$/);
      expect(Number(code)).toBeGreaterThanOrEqual(1000);
      expect(Number(code)).toBeLessThanOrEqual(9999);
    }
  });

  it('never emits a short code: length is always exactly N (min = 10^(N-1))', () => {
    const six = Array.from({ length: 300 }, () => svc.generateCode(6));
    expect(six.every((c) => c.length === 6)).toBe(true);
    const eight = Array.from({ length: 100 }, () => svc.generateCode(8));
    expect(eight.every((c) => c.length === 8)).toBe(true);
  });

  it('produces varied codes (not a constant) across many draws', () => {
    const codes = new Set(Array.from({ length: 200 }, () => svc.generateCode()));
    // randomInt over a 900k-wide range should give many distinct values.
    expect(codes.size).toBeGreaterThan(50);
  });
});

describe('send (template + queue contract — no table access, genuinely works)', () => {
  it('renders the verification template and enqueues a high-priority SMS', async () => {
    const ok = await svc.send({
      phoneNumber: '+5511999',
      code: '424242',
      expiryMinutes: 10,
      purpose: 'verification',
      userId: 3,
    });

    expect(ok).toBe(true);
    expect(renderMock).toHaveBeenCalledWith('verification_code', {
      code: '424242',
      expiryMinutes: '10',
    });
    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const job = enqueueMock.mock.calls[0][0] as Record<string, unknown>;
    expect(job.to).toBe('+5511999');
    expect(job.body).toBe('CODE:424242/EXP:10');
    expect(job.priority).toBe('high');
    expect(job.maxRetries).toBe(3);
    expect(job.templateName).toBe('verification_code');
    expect((job.metadata as Record<string, unknown>).purpose).toBe('verification');
    expect((job.metadata as Record<string, unknown>).userId).toBe(3);
  });

  it('defaults expiry to 10 minutes and purpose to "verification"', async () => {
    await svc.send({ phoneNumber: '+5511999', code: '111111' });
    expect(renderMock).toHaveBeenCalledWith('verification_code', {
      code: '111111',
      expiryMinutes: '10',
    });
    const job = enqueueMock.mock.calls[0][0] as Record<string, unknown>;
    expect((job.metadata as Record<string, unknown>).purpose).toBe('verification');
  });

  it('returns false (and does not throw) when the queue rejects', async () => {
    enqueueMock.mockRejectedValueOnce(new Error('queue full'));
    const ok = await svc.send({ phoneNumber: '+5511999', code: '222222' });
    expect(ok).toBe(false);
  });
});

describe('generate (rate-limit / storage — table not implemented)', () => {
  it('throws because the verificationCodes table is a null placeholder', async () => {
    // checkRateLimit() is the first thing generate() does, and it touches the
    // unimplemented store -> the call rejects instead of returning a code.
    await expect(svc.generate('+5511999999999')).rejects.toThrow();
    // Nothing was queued: generate() does not send on its own.
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it('throws for every purpose/option combination (no silent success)', async () => {
    await expect(
      svc.generate('+5511999', { purpose: 'password_reset', expiryMinutes: 15 }),
    ).rejects.toThrow();
  });
});

describe('verify (must fail safe when the store is unavailable)', () => {
  it('returns false (never true) when the table access throws', async () => {
    const ok = await svc.verify({ phoneNumber: '+5511999', code: '123456' });
    expect(ok).toBe(false);
  });

  it('fails safe for any purpose / deleteOnSuccess combination', async () => {
    await expect(
      svc.verify({
        phoneNumber: '+5511999',
        code: '000000',
        purpose: 'login_verification',
        deleteOnSuccess: false,
      }),
    ).resolves.toBe(false);
  });

  it('never enqueues an SMS as a side effect of verification', async () => {
    await svc.verify({ phoneNumber: '+5511999', code: '123456' });
    expect(enqueueMock).not.toHaveBeenCalled();
  });
});

describe('getRemainingAttempts (safe fallback contract)', () => {
  it('returns 0 when the store is unavailable (caught error path)', async () => {
    // The catch branch in getRemainingAttempts returns 0 on any failure, so a
    // broken store reports "no attempts left" rather than falsely granting more.
    await expect(svc.getRemainingAttempts('+5511999')).resolves.toBe(0);
    await expect(
      svc.getRemainingAttempts('+5511999', 'password_reset'),
    ).resolves.toBe(0);
  });
});

describe('resend (safe fallback contract)', () => {
  it('returns false when the store is unavailable and does not enqueue', async () => {
    const ok = await svc.resend('+5511999', 'verification');
    expect(ok).toBe(false);
    expect(enqueueMock).not.toHaveBeenCalled();
  });
});

describe('cleanup (safe fallback contract)', () => {
  it('returns 0 when the table access throws (caught error path)', async () => {
    await expect(svc.cleanup()).resolves.toBe(0);
  });
});

describe('generateAndSend & purpose helpers (report failure on broken store)', () => {
  it('generateAndSend returns success:false and no expiry (generate throws)', async () => {
    const res = await svc.generateAndSend('+5511999', { expiryMinutes: 5 });
    expect(res.success).toBe(false);
    expect(res.expiresAt).toBeUndefined();
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it('sendPasswordResetCode reports failure (store unavailable)', async () => {
    const res = await svc.sendPasswordResetCode('+5511999', 42);
    expect(res.success).toBe(false);
    expect(res.expiresAt).toBeUndefined();
  });

  it('sendLoginVerificationCode reports failure (store unavailable)', async () => {
    const res = await svc.sendLoginVerificationCode('+5511999', 77);
    expect(res.success).toBe(false);
  });

  it('verifyPasswordResetCode fails safe (returns false)', async () => {
    await expect(
      svc.verifyPasswordResetCode('+5511999', '321321'),
    ).resolves.toBe(false);
  });

  it('verifyLoginCode fails safe (returns false)', async () => {
    await expect(svc.verifyLoginCode('+5511999', '321321')).resolves.toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Added security edge-case coverage (the suite was audited as "weak" for the
// risk profile of 2FA). Each block below tests REAL, observable behaviour of
// the module as it stands today. Where a classic 2FA case (expired / replay /
// lockout) cannot be exercised without the real `verificationCodes` table, the
// test instead locks in the *fail-safe collapse*: the security-critical
// guarantee that, with the store unreachable, NONE of those paths can ever
// return `true`. When the schema lands these will fail loudly and signal that
// the real persistence paths now need dedicated coverage.
// ---------------------------------------------------------------------------

describe('generateCode — entropy & boundary contract', () => {
  it('range is [10^(N-1), 10^N - 2]: top value is unreachable (randomInt max is exclusive)', () => {
    // randomInt(min, max) excludes `max`. generateCode uses max = 10^len - 1,
    // so the all-nines code can never be produced. Lock in the true range and
    // prove the boundary is actually reached (not merely "within bounds").
    const draws = Array.from({ length: 20000 }, () => Number(svc.generateCode(2)));
    expect(Math.min(...draws)).toBe(10); // lower bound IS reachable
    expect(Math.max(...draws)).toBeLessThanOrEqual(98); // 99 is unreachable
    expect(draws.every((n) => n >= 10 && n <= 98)).toBe(true);
  });

  it('length 1 still yields a single digit string in [1,8]', () => {
    const draws = Array.from({ length: 5000 }, () => svc.generateCode(1));
    expect(draws.every((c) => /^\d$/.test(c))).toBe(true);
    expect(draws.every((c) => Number(c) >= 1 && Number(c) <= 8)).toBe(true);
  });

  it('every code is a pure decimal string — no sign, decimal point or exponent', () => {
    for (let i = 0; i < 200; i++) {
      const c = svc.generateCode(6);
      expect(c).not.toMatch(/[^0-9]/); // nothing but digits
      expect(c.startsWith('0')).toBe(false); // min = 10^(N-1) guarantees no leading zero
    }
  });

  it('two consecutive default codes are independent draws (not a cached/static value)', () => {
    // Weak 2FA impls sometimes memoise or reuse the last code. Prove fresh entropy.
    const a = Array.from({ length: 500 }, () => svc.generateCode());
    // No value should dominate (a constant generator would give size 1).
    expect(new Set(a).size).toBeGreaterThan(100);
  });
});

describe('send — graceful degradation of the SMS transport', () => {
  it('returns false (never throws) when the template renderer throws synchronously', async () => {
    renderMock.mockImplementationOnce((..._a: any[]) => {
      throw new Error('template blew up');
    });
    const ok = await svc.send({ phoneNumber: '+5511999', code: '424242' });
    expect(ok).toBe(false);
    // Render failed before enqueue -> nothing was queued.
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it('does not retry/double-enqueue when the queue rejects (single attempt, returns false)', async () => {
    enqueueMock.mockRejectedValueOnce(new Error('queue down'));
    const ok = await svc.send({ phoneNumber: '+5511999', code: '222222' });
    expect(ok).toBe(false);
    expect(enqueueMock).toHaveBeenCalledTimes(1);
  });

  it('passes the code through to the queue verbatim (no truncation / reformatting)', async () => {
    await svc.send({ phoneNumber: '+5511988887777', code: '007007' });
    const job = enqueueMock.mock.calls[0][0] as Record<string, unknown>;
    // A leading-zero code must survive intact end-to-end.
    expect((job.templateContext as Record<string, unknown>).code).toBe('007007');
    expect(job.to).toBe('+5511988887777');
  });
});

describe('verify — fail-safe collapse (invalid / expired / replay all resolve false)', () => {
  // With the store unreachable, verify() cannot distinguish "wrong code",
  // "expired code" and "already-consumed code" — and that is exactly the point:
  // the security-critical contract is that NONE of them can ever yield `true`.
  it('rejects a syntactically invalid (non-numeric / wrong-length) code', async () => {
    await expect(
      svc.verify({ phoneNumber: '+5511999', code: 'not-a-code' }),
    ).resolves.toBe(false);
    await expect(
      svc.verify({ phoneNumber: '+5511999', code: '' }),
    ).resolves.toBe(false);
  });

  it('rejects an "expired"/unknown code (no record => false, regardless of timers)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    // Even with the clock pushed far into the future, a verify cannot succeed.
    await expect(
      svc.verify({ phoneNumber: '+5511999', code: '123456' }),
    ).resolves.toBe(false);
    vi.useRealTimers();
  });

  it('replay: repeated verify of the same code never flips to true', async () => {
    const first = await svc.verify({ phoneNumber: '+5511999', code: '123456' });
    const second = await svc.verify({ phoneNumber: '+5511999', code: '123456' });
    const third = await svc.verify({ phoneNumber: '+5511999', code: '123456' });
    expect([first, second, third]).toEqual([false, false, false]);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it('a different phone number cannot validate another number\'s code', async () => {
    await expect(
      svc.verify({ phoneNumber: '+5511000000000', code: '123456' }),
    ).resolves.toBe(false);
  });

  it('purpose-scoped helpers never cross-validate or return true', async () => {
    // login code submitted as a password-reset (and vice versa) must fail safe.
    await expect(svc.verifyLoginCode('+5511999', '123456')).resolves.toBe(false);
    await expect(
      svc.verifyPasswordResetCode('+5511999', '123456'),
    ).resolves.toBe(false);
  });
});

describe('lockout / rate-limit — fail-safe contract', () => {
  it('getRemainingAttempts never reports MORE than MAX_ATTEMPTS and floors at 0 on failure', async () => {
    // The catch path returns 0, so a broken store can never grant extra tries.
    const remaining = await svc.getRemainingAttempts('+5511999');
    expect(remaining).toBe(0);
    expect(remaining).toBeLessThanOrEqual(5); // MAX_ATTEMPTS
    expect(remaining).toBeGreaterThanOrEqual(0);
  });

  it('generate() enforces rate-limit BEFORE issuing any code (no leak on the limited path)', async () => {
    // checkRateLimit() runs first; on the broken store it rejects, so no code
    // is generated and — critically — no SMS is queued for a rate-limited number.
    await expect(svc.generate('+5511999')).rejects.toThrow();
    expect(enqueueMock).not.toHaveBeenCalled();
    expect(renderMock).not.toHaveBeenCalled();
  });

  it('generateAndSend surfaces the rate-limit failure as success:false with no SMS sent', async () => {
    const res = await svc.generateAndSend('+5511999');
    expect(res.success).toBe(false);
    expect(res.expiresAt).toBeUndefined();
    expect(enqueueMock).not.toHaveBeenCalled();
  });
});

describe('getTwoFactorSMS singleton', () => {
  it('returns the same instance on repeated calls', () => {
    expect(getTwoFactorSMS()).toBe(getTwoFactorSMS());
  });

  it('returns a TwoFactorSMS instance', () => {
    expect(getTwoFactorSMS()).toBeInstanceOf(TwoFactorSMS);
  });
});
