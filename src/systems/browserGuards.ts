/** Blocks browser gestures (pinch zoom, double-tap zoom, context menu) that interfere with touch play. */
export function preventBrowserGestures(): void {
  const block = (e: Event): void => e.preventDefault();
  document.addEventListener('gesturestart', block, { passive: false });
  document.addEventListener('dblclick', block, { passive: false });
  document.addEventListener('contextmenu', block);
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false },
  );
}
