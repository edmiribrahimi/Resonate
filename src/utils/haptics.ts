/**
 * Haptic feedback for scan results. Graceful degradation on unsupported devices (iOS).
 *
 * Two things this file cannot fix, and which every caller must account for.
 * First, the door is dark and there is a queue: a member of staff reads the
 * phone at arm's length, at two in the morning, while talking to someone. The
 * pattern is what tells the three outcomes apart when the screen is barely
 * looked at. Second, iOS degrades `navigator.vibrate` to nothing at all — the
 * feature test below is not a formality, it is the common case on an iPhone.
 *
 * So the pattern is a **second channel, never the only one**. Each outcome
 * needs its own colour *and* its own icon *and* its own pattern; a state told
 * apart by hue alone is a state that half the devices at the door cannot tell
 * apart at all.
 */

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

/**
 * The third outcome: the entry was already recorded.
 *
 * Distinguishable from both siblings by feel alone — one long pulse is success,
 * a short-short burst is an error, and this is a long-then-short pair. It is
 * not a refusal: the person in front of the scanner was already admitted.
 */
export function vibrateAlreadyRecorded() {
  if ("vibrate" in navigator) {
    navigator.vibrate([300, 80, 120]);
  }
}
