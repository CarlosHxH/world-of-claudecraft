// Unit coverage for moderationErrorBody (server/http_util.ts): the Phase 22
// legacy-body moderation formatter. It rides the additive machine `code` (and, for
// a timed suspension, the machine-readable `date`) alongside the UNTOUCHED legacy
// prose, deriving the code from the status fields EXACTLY as the problem+json
// requireAccount mapping does (server/http/middleware/require_account.ts). This
// pins all four branches, the precedence order, the date-only-on-suspension rule,
// and that the prose is passed through byte-for-byte.

import { describe, expect, it } from 'vitest';
import { moderationErrorBody } from '../../server/http_util';

const SUSPENDED_ISO = '2026-08-01T00:00:00.000Z';

describe('moderationErrorBody', () => {
  it('maps a ban to moderation.banned with no date', () => {
    expect(
      moderationErrorBody({
        message: 'This account has been banned.',
        banned: true,
        suspendedUntil: null,
        deactivated: false,
      }),
    ).toEqual({ error: 'This account has been banned.', code: 'moderation.banned' });
  });

  it('maps an active suspension to moderation.suspended_until with the ISO date param', () => {
    expect(
      moderationErrorBody({
        message: `This account is suspended until ...`,
        banned: false,
        suspendedUntil: SUSPENDED_ISO,
        deactivated: false,
      }),
    ).toEqual({
      error: 'This account is suspended until ...',
      code: 'moderation.suspended_until',
      date: SUSPENDED_ISO,
    });
  });

  it('maps a self-deactivation to account.deactivated with no date', () => {
    expect(
      moderationErrorBody({
        message: 'This account has been deactivated.',
        banned: false,
        suspendedUntil: null,
        deactivated: true,
      }),
    ).toEqual({ error: 'This account has been deactivated.', code: 'account.deactivated' });
  });

  it('falls back to moderation.suspended for a locked-but-unclassified status', () => {
    expect(
      moderationErrorBody({
        message: 'this account is suspended.',
        banned: false,
        suspendedUntil: null,
        deactivated: false,
      }),
    ).toEqual({ error: 'this account is suspended.', code: 'moderation.suspended' });
  });

  it('lets a ban outrank an active suspension AND a deactivation (banned checked first)', () => {
    // A banned+suspended+deactivated row must surface the ban, mirroring the
    // moderationStatusForAccount branch order and require_account precedence.
    expect(
      moderationErrorBody({
        message: 'This account has been banned.',
        banned: true,
        suspendedUntil: SUSPENDED_ISO,
        deactivated: true,
      }),
    ).toEqual({ error: 'This account has been banned.', code: 'moderation.banned' });
  });

  it('prefers the timed-suspension code over deactivation when both are set', () => {
    expect(
      moderationErrorBody({
        message: 'suspended',
        banned: false,
        suspendedUntil: SUSPENDED_ISO,
        deactivated: true,
      }),
    ).toEqual({ error: 'suspended', code: 'moderation.suspended_until', date: SUSPENDED_ISO });
  });

  it('passes the prose message through byte-for-byte and never adds a date off a suspension', () => {
    const body = moderationErrorBody({
      message: 'literal PROSE stays 100% unchanged',
      banned: false,
      suspendedUntil: null,
      deactivated: false,
    });
    expect(body.error).toBe('literal PROSE stays 100% unchanged');
    expect('date' in body).toBe(false);
  });
});
