// Unit tests for the deed name/desc/title resolver (src/ui/deed_i18n.ts):
// English resolution from the live catalog, the unknown-id fallbacks, the
// ''-for-non-title gate (load-bearing: the hud inspect/nameplate surfaces
// hide entirely on ''), and the release-fill manifest shape.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  deedBroadcastLine,
  deedDesc,
  deedName,
  deedTitleText,
  deedTranslationManifest,
  titledDisplayName,
  titledNameDecoration,
} from '../src/ui/deed_i18n';

describe('deed_i18n English resolution', () => {
  it('resolves name and desc from the catalog def', () => {
    expect(deedName('prog_first_steps')).toBe('First Steps');
    expect(deedDesc('prog_first_steps')).toBe(
      'Reach level 2 and take your first step on a long road.',
    );
  });

  it('falls back for catalog-unknown ids (content drift)', () => {
    expect(deedName('removed_deed')).toBe('removed_deed');
    expect(deedDesc('removed_deed')).toBe('');
    expect(deedTitleText('removed_deed')).toBe('');
  });

  it("returns title text only for title-reward deeds, '' otherwise (the hide gate)", () => {
    expect(deedTitleText('prog_veteran')).toBe('Veteran');
    expect(deedTitleText('hid_saul_footnote')).toBe('the Footnote');
    // No reward at all, and a border (non-title) reward: both hide.
    expect(deedTitleText('prog_first_steps')).toBe('');
    expect(deedTitleText('prog_prestige_10')).toBe('');
    expect(deedTitleText('dgn_deepward')).toBe('');
  });

  it('manifests one row per name and desc plus one per title reward', () => {
    const manifest = deedTranslationManifest();
    // 192 deeds x (name + desc) + the 19 shipped title rewards.
    expect(manifest.length).toBe(192 * 2 + 19);
    expect(manifest.filter((row) => row.field === 'title').length).toBe(19);
    expect(manifest).toContainEqual({
      id: 'prog_veteran',
      field: 'title',
      source: 'Veteran',
    });
    for (const row of manifest) expect(row.source.length).toBeGreaterThan(0);
  });
});

describe('deedBroadcastLine (the guild-chat news line)', () => {
  it('composes the chrome key with the earner name and the localized deed name', () => {
    expect(deedBroadcastLine('Hilda', 'prog_veteran')).toBe(
      'Hilda has accomplished a deed: Veteran',
    );
  });

  it('a catalog-unknown id degrades to the raw id, never a crash or empty line', () => {
    expect(deedBroadcastLine('Hilda', 'removed_deed')).toBe(
      'Hilda has accomplished a deed: removed_deed',
    );
  });

  it('the HUD switch arm stays wired to this composer with the guild-chat green', () => {
    // hud.ts cannot be unit-driven (DOM monolith); the live wiring was
    // verified end to end against a real server, and this source pin keeps
    // the arm from being dropped or detached from the pinned composer.
    const hudSrc = readFileSync(new URL('../src/ui/hud.ts', import.meta.url), 'utf8');
    const arm = hudSrc.slice(hudSrc.indexOf("case 'deedBroadcast'"));
    expect(arm.length).toBeGreaterThan(0);
    expect(arm.slice(0, 600)).toContain(
      "this.log(deedBroadcastLine(ev.characterName, ev.deedId), '#40d264');",
    );
  });
});

describe('titledDisplayName + titledNameDecoration (the name-plus-title pattern)', () => {
  it('decorates a titled name through the hudChrome.deeds.titledName pattern', () => {
    expect(titledDisplayName('Hilda', 'prog_veteran')).toBe('Hilda [Veteran]');
    expect(titledDisplayName('Hilda', 'hid_saul_footnote')).toBe('Hilda [the Footnote]');
  });

  it('returns the bare name for null, undefined, stale, and non-title ids', () => {
    expect(titledDisplayName('Hilda', null)).toBe('Hilda');
    expect(titledDisplayName('Hilda', undefined)).toBe('Hilda');
    expect(titledDisplayName('Hilda', 'removed_deed')).toBe('Hilda');
    expect(titledDisplayName('Hilda', 'prog_first_steps')).toBe('Hilda'); // no reward
    expect(titledDisplayName('Hilda', 'prog_prestige_10')).toBe('Hilda'); // border reward
  });

  it('splits the pattern into pre/post decoration around the name', () => {
    // The English pattern places the whole decoration after the name.
    expect(titledNameDecoration('prog_veteran')).toEqual({ pre: '', post: ' [Veteran]' });
  });

  it('collapses to empty decoration for untitled, stale, and non-title ids', () => {
    const empty = { pre: '', post: '' };
    expect(titledNameDecoration(null)).toEqual(empty);
    expect(titledNameDecoration(undefined)).toEqual(empty);
    expect(titledNameDecoration('removed_deed')).toEqual(empty);
    expect(titledNameDecoration('prog_prestige_10')).toEqual(empty);
  });

  it('the chat sender span composes through titledDisplayName over the CLOSURED raw name', () => {
    // chatLogFrom decorates only the DISPLAYED text; the context-menu handlers
    // must keep closing over the raw `name` so whisper/social lookups work,
    // and the "To {name}" whisper echo must never receive the sender's title.
    const hudSrc = readFileSync(new URL('../src/ui/hud.ts', import.meta.url), 'utf8');
    const fn = hudSrc.slice(hudSrc.indexOf('private chatLogFrom('));
    expect(fn.slice(0, 1600)).toContain('sender.textContent = titledDisplayName(name, fromTitle);');
    expect(fn.slice(0, 1600)).toContain('this.openChatPlayerContextMenu(name, ev.clientX');
    const toWhisperArm = hudSrc.slice(hudSrc.indexOf('CHAT_TEMPLATE_KEYS.toWhisper') - 200);
    expect(toWhisperArm.slice(0, 400)).not.toContain('ev.fromTitle');
  });
});
