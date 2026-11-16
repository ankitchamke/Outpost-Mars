/**
 * OUTPOST: MARS — Touch & Virtual Joystick Utilities
 *
 * Provides robust touch capability detection, ergonomic joystick positioning,
 * and vector mathematics for touch-based mobile and tablet gameplay.
 */

export const JOYSTICK_RADIUS = 34;
export const JOYSTICK_HIT_MARGIN = 22;
export const JOYSTICK_HIT_RADIUS = JOYSTICK_RADIUS + JOYSTICK_HIT_MARGIN; // 56px radius (112px touch zone)
export const JOYSTICK_MARGIN = 56;

export interface JoystickPosition {
  x: number;
  y: number;
}

export interface JoystickVector {
  x: number;
  y: number;
  magnitude: number;
}

/**
 * Detects whether the current environment supports touch input.
 * Evaluates navigator.maxTouchPoints, 'ontouchstart' in window,
 * and coarse pointer media queries.
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const hasMaxTouchPoints =
    typeof navigator !== 'undefined' &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 0;

  const hasTouchStart = 'ontouchstart' in window;

  const hasCoarsePointer =
    typeof window.matchMedia === 'function' &&
    (window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(any-pointer: coarse)').matches);

  return hasMaxTouchPoints || hasTouchStart || hasCoarsePointer;
}

/**
 * Calculates the ergonomic bottom-left screen position for the virtual joystick,
 * keeping it clear of HUD panels, telemetry, and building interaction prompts.
 *
 * @param viewportWidth Width of the viewport in CSS pixels
 * @param viewportHeight Height of the viewport in CSS pixels
 * @param margin Distance from screen edges in pixels
 */
export function getJoystickPosition(
  viewportWidth: number,
  viewportHeight: number,
  margin = JOYSTICK_MARGIN
): JoystickPosition {
  const x = Math.max(margin, Math.min(margin, viewportWidth - margin));
  const y = Math.max(margin, viewportHeight - margin);
  return { x, y };
}

/**
 * Calculates the normalized movement vector from a pointer offset relative
 * to the joystick center. Clamps magnitude to 1.0 (unit circle).
 *
 * @param dx Horizontal offset from joystick center
 * @param dy Vertical offset from joystick center
 * @param radius Radius of the joystick base
 */
export function calculateJoystickVector(
  dx: number,
  dy: number,
  radius = JOYSTICK_RADIUS
): JoystickVector {
  const distance = Math.hypot(dx, dy);
  if (distance === 0 || radius <= 0) {
    return { x: 0, y: 0, magnitude: 0 };
  }

  const rawX = dx / radius;
  const rawY = dy / radius;
  const rawMagnitude = Math.hypot(rawX, rawY);

  if (rawMagnitude <= 1) {
    return { x: rawX, y: rawY, magnitude: rawMagnitude };
  }

  return {
    x: rawX / rawMagnitude,
    y: rawY / rawMagnitude,
    magnitude: 1,
  };
}

/**
 * Determines whether a screen coordinate falls within the bottom-left
 * movement control zone suitable for virtual joystick activation.
 *
 * @param x Screen X coordinate
 * @param y Screen Y coordinate
 * @param viewportWidth Screen/canvas width
 * @param viewportHeight Screen/canvas height
 */
export function isPointInMovementZone(
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number
): boolean {
  const maxZoneWidth = Math.max(160, Math.min(viewportWidth * 0.42, 280));
  const minZoneY = Math.max(viewportHeight * 0.52, viewportHeight - 260);

  return x >= 0 && x <= maxZoneWidth && y >= minZoneY && y <= viewportHeight;
}

