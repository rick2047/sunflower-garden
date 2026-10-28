const DEFAULT_SAFE_AREA = Object.freeze({ top: 64, right: 12, bottom: 120, left: 12 });

const clamp = (value, low, high) => Math.max(low, Math.min(value, high));

function validatePositive(name, value) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`);
  }
}

function overlapArea(a, b) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return width * height;
}

/**
 * Places one dialogue bubble near a projected character anchor.
 *
 * Inputs and the returned rectangle use viewport pixels. The layout prefers a
 * bubble above the speaker, moves it below when the top safe area leaves too
 * little room, and scores alternate offsets against protected screen regions.
 */
export function layoutSpeechBubble({
  anchor,
  size,
  viewport,
  obstacles = [],
  safeArea = DEFAULT_SAFE_AREA,
  gap = 14,
}) {
  for (const [name, value] of Object.entries({
    'anchor.x': anchor?.x,
    'anchor.y': anchor?.y,
    'size.width': size?.width,
    'size.height': size?.height,
    'viewport.width': viewport?.width,
    'viewport.height': viewport?.height,
    gap,
  })) {
    if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  }
  validatePositive('size.width', size.width);
  validatePositive('size.height', size.height);
  validatePositive('viewport.width', viewport.width);
  validatePositive('viewport.height', viewport.height);
  if (gap < 0) throw new RangeError('gap must be non-negative');
  if (size.width > viewport.width || size.height > viewport.height) {
    throw new RangeError('speech bubble is larger than the viewport');
  }

  const insets = { ...DEFAULT_SAFE_AREA, ...safeArea };
  for (const [name, value] of Object.entries(insets)) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError(`safeArea.${name} must be non-negative`);
  }
  let minLeft = insets.left, maxLeft = viewport.width - insets.right - size.width;
  let minTop = insets.top, maxTop = viewport.height - insets.bottom - size.height;
  if (maxLeft < minLeft) minLeft = maxLeft = (viewport.width - size.width) / 2;
  if (maxTop < minTop) minTop = maxTop = (viewport.height - size.height) / 2;

  const shift = Math.max(28, size.width * 0.44);
  const above = anchor.y - gap - size.height;
  const candidates = [
    { centerX: anchor.x, top: above, placement: 'above' },
    { centerX: anchor.x - shift, top: above, placement: 'above' },
    { centerX: anchor.x + shift, top: above, placement: 'above' },
    { centerX: anchor.x, top: above - 36, placement: 'above' },
    { centerX: anchor.x, top: anchor.y + gap, placement: 'below' },
    { centerX: anchor.x - shift, top: anchor.y + gap, placement: 'below' },
    { centerX: anchor.x + shift, top: anchor.y + gap, placement: 'below' },
  ];

  let best = null;
  for (const candidate of candidates) {
    const left = clamp(candidate.centerX - size.width / 2, minLeft, maxLeft);
    const top = clamp(candidate.top, minTop, maxTop);
    const rect = { left, top, right: left + size.width, bottom: top + size.height };
    const targetEdge = candidate.placement === 'above' ? anchor.y - gap : anchor.y + gap;
    const actualEdge = candidate.placement === 'above' ? rect.bottom : rect.top;
    let score = Math.abs(actualEdge - targetEdge)
      + Math.abs(left + size.width / 2 - anchor.x) * 0.35
      + (candidate.placement === 'below' ? 24 : 0);
    for (const obstacle of obstacles) {
      const area = overlapArea(rect, obstacle);
      if (area > 0) score += 100000 + area * 1000;
    }
    if (best === null || score < best.score) best = { ...candidate, left, top, rect, score };
  }

  return {
    left: best.left,
    top: best.top,
    width: size.width,
    height: size.height,
    placement: best.placement,
    tailOffset: clamp(anchor.x - (best.left + size.width / 2), -size.width / 2 + 18, size.width / 2 - 18),
    rect: best.rect,
  };
}
