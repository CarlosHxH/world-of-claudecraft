// Pure DOM predicate: is `target` a drag handle for the floating window `win`?
//
// Extracted from Hud so the recognition rule is unit-testable without a live Hud
// (it needs no Hud state: only the two elements). Two window grammars share one
// move system: the legacy floating windows carry a `.panel-title` header, and the
// AAA grammar-built windows (src/ui/window_frame.ts) carry a `.window-titlebar`.
// Both are drag handles, so every grammar-built window inherits the Market's
// draggability.
//
// An interactive control inside the header never starts a drag (so the close
// button, a titlebar dropdown, or a future titlebar input keeps its own click),
// and #map-window is the one headerless window: its whole body is the handle.

// Controls that keep their own pointer interaction: dragging one of these never
// starts a window move, even when it sits inside the titlebar.
const DRAG_HANDLE_EXCLUDE =
  'button, input, textarea, select, a, .x-btn, .ui-dd, [draggable="true"], #map-canvas, #map-zoom';

// The two header grammars that act as a move handle: the legacy `.panel-title`
// and the AAA `.window-titlebar` (window_frame.ts).
const DRAG_HANDLE_SELECTOR = '.panel-title, .window-titlebar';

/**
 * True when a pointerdown on `target` should begin dragging `win`.
 *
 * Returns false for any excluded interactive control (so the close button never
 * drags), true when the target is within a `.panel-title` / `.window-titlebar`
 * that belongs to `win`, and true for the headerless #map-window body.
 */
export function isWindowDragHandle(target: HTMLElement, win: HTMLElement): boolean {
  if (target.closest(DRAG_HANDLE_EXCLUDE)) return false;
  const handle = target.closest(DRAG_HANDLE_SELECTOR);
  if (handle && win.contains(handle)) return true;
  return win.id === 'map-window' && target === win;
}
