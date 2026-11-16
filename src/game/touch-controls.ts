/**
 * OUTPOST: MARS — Touch & Virtual Joystick Utilities
 *
 * Provides robust touch capability detection, ergonomic joystick positioning,
 * and vector mathematics for touch-based mobile and tablet gameplay.
 */

export const JOYSTICK_RADIUS = 44;
export const JOYSTICK_HIT_MARGIN = 31;
export const JOYSTICK_HIT_RADIUS = JOYSTICK_RADIUS + JOYSTICK_HIT_MARGIN; // 75px radius (150px touch zone)
export const JOYSTICK_MARGIN = 70; // Shared distance from the viewport bottom to the control center
export const MIN_CONTROL_EDGE_CLEARANCE = 16;
export const MAX_CONTROL_EDGE_CLEARANCE = 24;
export const CONTROL_EDGE_CLEARANCE_RATIO = 0.046;

export interface JoystickDockInsets {
  /** CSS-pixel clearance from the left viewport edge to the joystick's outside edge. */
  leftClearance?: number;
  /** CSS-pixel distance from the viewport bottom to the joystick center. */
  bottomFromEdge?: number;
  /** Joystick radius in the same coordinate space as the supplied viewport size. */
  radius?: number;
}

export interface JoystickPosition {
  x: number;
  y: number;
}

export interface JoystickVector {
  x: number;
  y: number;
  magnitude: number;
}

export interface CameraViewportTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  originX: number;
  originY: number;
  rotation: number;
  zoomX: number;
  zoomY: number;
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
 * Returns a fixed screen-space joystick center, with the outer ring kept inside
 * the requested edge clearance. Callers may pass the computed CSS safe-area
 * inset and dock offset so Phaser and DOM controls use the same reference.
 *
 * @param viewportWidth Width of the viewport in CSS pixels
 * @param viewportHeight Height of the viewport in CSS pixels
 * @param insets Safe-area-aware CSS dock measurements and joystick radius
 */
export function getJoystickPosition(
  viewportWidth: number,
  viewportHeight: number,
  insets: JoystickDockInsets = {}
): JoystickPosition {
  const radius = Math.max(0, insets.radius ?? JOYSTICK_RADIUS);
  const edgeClearance = Math.max(
    0,
    insets.leftClearance ?? getControlEdgeClearance(viewportWidth)
  );
  const bottomFromEdge = Math.max(0, insets.bottomFromEdge ?? JOYSTICK_MARGIN);
  const requestedX = edgeClearance + radius;
  const requestedY = viewportHeight - bottomFromEdge;

  const x = clampControlCenter(requestedX, viewportWidth, radius);
  const y = clampControlCenter(requestedY, viewportHeight, radius);
  return { x, y };
}

export function getControlEdgeClearance(viewportWidth: number): number {
  return Math.max(
    MIN_CONTROL_EDGE_CLEARANCE,
    Math.min(MAX_CONTROL_EDGE_CLEARANCE, viewportWidth * CONTROL_EDGE_CLEARANCE_RATIO)
  );
}

/**
 * Inverts Phaser's camera transform for an object with scrollFactor 0.
 * The returned world point renders at the requested canvas point despite
 * camera zoom or rotation, keeping the joystick aligned with DOM overlays.
 */
export function getCameraCompensatedPosition(
  screenPosition: JoystickPosition,
  camera: CameraViewportTransform
): JoystickPosition {
  const zoomX = camera.zoomX || 1;
  const zoomY = camera.zoomY || 1;
  const originX = camera.width * camera.originX;
  const originY = camera.height * camera.originY;
  const screenOffsetX = screenPosition.x - camera.x - originX;
  const screenOffsetY = screenPosition.y - camera.y - originY;
  const cos = Math.cos(camera.rotation);
  const sin = Math.sin(camera.rotation);

  return {
    x: originX + (cos * screenOffsetX + sin * screenOffsetY) / zoomX,
    y: originY + (-sin * screenOffsetX + cos * screenOffsetY) / zoomY,
  };
}

function clampControlCenter(value: number, viewportSize: number, radius: number): number {
  if (viewportSize <= radius * 2) return viewportSize / 2;
  return Math.max(radius, Math.min(viewportSize - radius, value));
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

