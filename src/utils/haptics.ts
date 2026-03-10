/** Haptic feedback for scan results. Graceful degradation on unsupported devices (iOS). */

export function vibrateSuccess() {
  if ("vibrate" in navigator) {
    navigator.vibrate(200);
  }
}

export function vibrateError() {
  if ("vibrate" in navigator) {
    navigator.vibrate([100, 50, 100]);
  }
}
