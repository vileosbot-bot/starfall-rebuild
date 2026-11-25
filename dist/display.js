// Request fullscreen while the click still has user activation. Orientation can
// only be locked once fullscreen has been granted on supporting mobile browsers.
export function canFullscreen(root) {
  return typeof root.requestFullscreen === 'function' && root.ownerDocument.fullscreenEnabled !== false;
}

export async function enterLandscape(root, orientation, mobile) {
  try {
    if (!root.ownerDocument.fullscreenElement) {
      if (!canFullscreen(root)) return false;
      await root.requestFullscreen();
    }
    if (mobile) {
      if (typeof orientation?.lock !== 'function') return false;
      await orientation.lock('landscape');
    }
    return true;
  } catch {
    return false;
  }
}
