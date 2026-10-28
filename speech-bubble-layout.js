const DEFAULT_SAFE_AREA = Object.freeze({ top: 64, right: 12, bottom: 120, left: 12 });
const NO_OBSTACLES = Object.freeze([]);
const TAIL_EDGE_INSET = 18;

const clamp = (value, low, high) => Math.max(low, Math.min(value, high));

export function speechBubbleTailOffset(anchorX, left, width) {
  const halfWidth = width / 2;
  return clamp(anchorX - (left + halfWidth), -halfWidth + TAIL_EDGE_INSET, halfWidth - TAIL_EDGE_INSET);
}

function validatePositive(name, value) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`);
  }
}

function validateNonNegative(name, value) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be non-negative and finite`);
  }
}

function overlapArea(left, top, right, bottom, obstacle) {
  const width = Math.max(0, Math.min(right, obstacle.right) - Math.max(left, obstacle.left));
  const height = Math.max(0, Math.min(bottom, obstacle.bottom) - Math.max(top, obstacle.top));
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
  obstacles = NO_OBSTACLES,
  safeArea = DEFAULT_SAFE_AREA,
  gap = 14,
}) {
  if (!Number.isFinite(anchor?.x)) throw new TypeError('anchor.x must be finite');
  if (!Number.isFinite(anchor?.y)) throw new TypeError('anchor.y must be finite');
  validatePositive('size.width', size?.width);
  validatePositive('size.height', size?.height);
  validatePositive('viewport.width', viewport?.width);
  validatePositive('viewport.height', viewport?.height);
  if (!Number.isFinite(gap) || gap < 0) throw new RangeError('gap must be non-negative and finite');
  if (size.width > viewport.width || size.height > viewport.height) {
    throw new RangeError('speech bubble is larger than the viewport');
  }

  const topInset = safeArea?.top ?? DEFAULT_SAFE_AREA.top;
  const rightInset = safeArea?.right ?? DEFAULT_SAFE_AREA.right;
  const bottomInset = safeArea?.bottom ?? DEFAULT_SAFE_AREA.bottom;
  const leftInset = safeArea?.left ?? DEFAULT_SAFE_AREA.left;
  validateNonNegative('safeArea.top', topInset);
  validateNonNegative('safeArea.right', rightInset);
  validateNonNegative('safeArea.bottom', bottomInset);
  validateNonNegative('safeArea.left', leftInset);

  let minLeft = leftInset, maxLeft = viewport.width - rightInset - size.width;
  let minTop = topInset, maxTop = viewport.height - bottomInset - size.height;
  if (maxLeft < minLeft) minLeft = maxLeft = (viewport.width - size.width) / 2;
  if (maxTop < minTop) minTop = maxTop = (viewport.height - size.height) / 2;

  const shift = Math.max(28, size.width * 0.44);
  const above = anchor.y - gap - size.height;
  let bestScore = Infinity, bestLeft = 0, bestTop = 0, bestPlacement = 'above';
  for (let candidate = 0; candidate < 7; candidate++) {
    let centerX = anchor.x, candidateTop = above, below = false;
    if (candidate === 1) centerX -= shift;
    else if (candidate === 2) centerX += shift;
    else if (candidate === 3) candidateTop -= 36;
    else if (candidate >= 4) {
      below = true;
      centerX = candidate === 5 ? anchor.x - shift : candidate === 6 ? anchor.x + shift : anchor.x;
      candidateTop = anchor.y + gap;
    }

    const left = clamp(centerX - size.width / 2, minLeft, maxLeft);
    const top = clamp(candidateTop, minTop, maxTop);
    const right = left + size.width, bottom = top + size.height;
    const targetEdge = below ? anchor.y + gap : anchor.y - gap;
    const actualEdge = below ? top : bottom;
    let score = Math.abs(actualEdge - targetEdge)
      + Math.abs(left + size.width / 2 - anchor.x) * 0.35 + (below ? 24 : 0);
    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i];
      const area = overlapArea(left, top, right, bottom, obstacle);
      if (area > 0) score += 100000 + area * 1000;
    }
    if (score < bestScore) {
      bestScore = score;
      bestLeft = left;
      bestTop = top;
      bestPlacement = below ? 'below' : 'above';
    }
  }

  return {
    left: bestLeft,
    top: bestTop,
    width: size.width,
    height: size.height,
    placement: bestPlacement,
    tailOffset: speechBubbleTailOffset(anchor.x, bestLeft, size.width),
    minLeft,
    maxLeft,
    minTop,
    maxTop,
    rect: { left: bestLeft, top: bestTop, right: bestLeft + size.width, bottom: bestTop + size.height },
  };
}
