// Multi-touch input built on Pointer Events. Every control tracks its own pointerId, so a
// thumb holding the joystick never blocks (or is disturbed by) another finger on a button.

/**
 * Virtual joystick. Owns exactly one pointerId while held; other pointers are ignored.
 * onVector({x,y}) receives a vector with length 0..1 (screen axes: +x right, +y down).
 */
export function createJoystick(root, knob, { onVector = () => {}, deadzone = .14, travel = .34 } = {}) {
  const state = { pointerId: null, x: 0, y: 0 };
  const set = (x, y, px = 0, py = 0) => {
    state.x = x; state.y = y; knob.style.transform = `translate(${px.toFixed(1)}px,${py.toFixed(1)}px)`;
    root.classList.toggle('active', state.pointerId !== null); onVector({ x, y });
  };
  const update = e => {
    const b = root.getBoundingClientRect(), dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
    const max = b.width * travel, len = Math.hypot(dx, dy), k = len > max ? max / len : 1, n = Math.min(1, len / max);
    if (n < deadzone) set(0, 0, dx * k, dy * k); else set(dx / len * n, dy / len * n, dx * k, dy * k);
  };
  const release = e => {
    if (e && e.pointerId !== state.pointerId) return; // another finger lifting must not reset the stick
    const id = state.pointerId; state.pointerId = null;
    if (id !== null) { try { root.releasePointerCapture(id); } catch {} }
    set(0, 0);
  };
  root.addEventListener('pointerdown', e => {
    if (state.pointerId !== null) return; // already owned by another finger
    e.preventDefault(); state.pointerId = e.pointerId;
    try { root.setPointerCapture(e.pointerId); } catch {}
    update(e);
  });
  root.addEventListener('pointermove', e => { if (e.pointerId === state.pointerId) { e.preventDefault(); update(e); } });
  root.addEventListener('pointerup', release); root.addEventListener('pointercancel', release);
  root.addEventListener('lostpointercapture', e => { if (e.pointerId === state.pointerId) release(e); });
  root.addEventListener('contextmenu', e => e.preventDefault());
  return { get vector() { return { x: state.x, y: state.y }; }, get pointerId() { return state.pointerId; }, reset: () => release(null) };
}

/**
 * Pointer-driven button. Fires `down` immediately on pointerdown and tracks only the pointer
 * that pressed it: `drag(dx,dy,e)` once the finger travels past `threshold`, then `up({dragged})`
 * or `cancel()`. Keyboard activation (Enter/Space) arrives as a click with detail 0 -> `key`.
 */
export function bindPress(el, { down, up, drag, cancel, key, threshold = 14 } = {}) {
  let id = null, sx = 0, sy = 0, dragged = false;
  const finish = (e, cancelled) => {
    if (id === null || e.pointerId !== id) return;
    try { el.releasePointerCapture(id); } catch {}
    id = null; el.classList.remove('pressed');
    if (cancelled) cancel?.(e); else up?.({ dragged, event: e });
    dragged = false;
  };
  el.addEventListener('pointerdown', e => {
    if (id !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault(); id = e.pointerId; sx = e.clientX; sy = e.clientY; dragged = false; el.classList.add('pressed');
    try { el.setPointerCapture(id); } catch {}
    down?.(e);
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerId !== id || !drag) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (dragged || Math.hypot(dx, dy) > threshold) { dragged = true; drag(dx, dy, e); }
  });
  el.addEventListener('pointerup', e => finish(e, false));
  el.addEventListener('pointercancel', e => finish(e, true));
  el.addEventListener('lostpointercapture', e => finish(e, true));
  el.addEventListener('click', e => { if (e.detail === 0) key?.(e); else e.preventDefault(); });
  el.addEventListener('contextmenu', e => e.preventDefault());
  return { get pointerId() { return id; } };
}
