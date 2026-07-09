import { describe, expect, it } from 'vitest';
import { isWindowDragHandle } from '../src/ui/window_drag_handle';

// Fake-DOM harness (this repo deliberately has no jsdom; tests/CLAUDE.md: model
// only the contract under test). isWindowDragHandle touches exactly: the target
// ownerDocument.body.classList, target.closest(sel), and win.id / win.contains.
function scenario(
  winId: string,
  opts: { mobile?: boolean; targetIsControl?: boolean; headerless?: boolean } = {},
) {
  const body = { classList: { contains: (c: string) => c === 'mobile-touch' && !!opts.mobile } };
  const ownerDocument = { body };
  const titlebar = { ownerDocument } as unknown as HTMLElement;
  // The headerless window (map) is its own drag target: its body carries closest
  // (returning null for both selectors) so the id + target === win rule fires.
  const win = {
    id: winId,
    ownerDocument,
    contains: (el: unknown) => el === titlebar || el === win,
    closest: () => null,
  } as unknown as HTMLElement & { contains(el: unknown): boolean };
  const target = {
    ownerDocument,
    closest: (sel: string): unknown => {
      if (sel.includes('.window-titlebar')) return titlebar;
      // The excluded-controls selector (button/input/.x-btn/...) resolves to the
      // target only when it is itself such a control.
      return opts.targetIsControl ? target : null;
    },
  } as unknown as HTMLElement;
  return { target: opts.headerless ? (win as unknown as HTMLElement) : target, win };
}

describe('isWindowDragHandle: options-menu exclusion (P2)', () => {
  it('a titlebar drag on a normal framed window still begins a move', () => {
    const { target, win } = scenario('vendor-window');
    expect(isWindowDragHandle(target, win)).toBe(true);
  });

  it('the Esc options menu never drags, even from its titlebar', () => {
    const { target, win } = scenario('options-menu');
    expect(isWindowDragHandle(target, win)).toBe(false);
  });

  it('still bails on the mobile touch HUD (unchanged)', () => {
    const { target, win } = scenario('options-menu', { mobile: true });
    expect(isWindowDragHandle(target, win)).toBe(false);
  });

  it('an interactive control inside a draggable titlebar never starts a drag', () => {
    const { target, win } = scenario('vendor-window', { targetIsControl: true });
    expect(isWindowDragHandle(target, win)).toBe(false);
  });

  it('the headerless world map still drags from its body (regression: exclusion is scoped)', () => {
    const { target, win } = scenario('map-window', { headerless: true });
    expect(isWindowDragHandle(target, win)).toBe(true);
  });
});
