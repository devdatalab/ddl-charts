/**
 * Pure-geometry layout helpers for charts: label de-collision, 1D beeswarm
 * packing, and nearest-point hit testing.
 *
 * These are framework-agnostic math utilities — no DOM access, no D3, safe in
 * SSR and browser alike. Ported from the Urban Data Commons frontend
 * (udc-frontend `src/lib/utils/{chartScales,beeswarm,nearestPoint}.ts`) so the
 * same logic can back D3 components here without duplication.
 *
 * Upstream dependencies: none.
 */

/**
 * Separate a set of Y positions so adjacent entries are at least `minGap`
 * apart. Maintains relative ordering and re-centers the adjusted group around
 * the original mean to minimise total displacement. Useful for spacing out
 * crowded end-of-line series labels.
 *
 * @param {number[]} positions - Y positions in pixels, in any order.
 * @param {number} minGap - Minimum required separation in pixels.
 * @returns {number[]} Adjusted positions, in the same order as the input.
 */
export function resolveCollisions(positions, minGap) {
  if (positions.length <= 1) return [...positions];

  // Sort by original value so we can do a greedy downward pass.
  const indexed = positions.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const adjusted = indexed.map(({ y }) => y);

  const originalMean = positions.reduce((s, y) => s + y, 0) / positions.length;

  // Greedy pass: push each label down past the previous if too close.
  for (let j = 1; j < adjusted.length; j++) {
    if (adjusted[j] < adjusted[j - 1] + minGap) {
      adjusted[j] = adjusted[j - 1] + minGap;
    }
  }

  // Re-centre around the original mean to minimise displacement.
  const adjustedMean = adjusted.reduce((s, y) => s + y, 0) / adjusted.length;
  const shift = originalMean - adjustedMean;

  const result = [...positions];
  indexed.forEach(({ i }, j) => {
    result[i] = adjusted[j] + shift;
  });
  return result;
}

/**
 * Compute deterministic dot positions for a horizontal beeswarm track. Places
 * dots along a horizontal axis, stacking rows vertically to avoid overlap.
 * Output order matches input order so the result can be zipped with the source
 * array. Callers must filter NaN/null values before passing them in.
 *
 * Algorithm (O(n²) worst case; fine for n ≤ 250):
 *  1. Sort indices by x (via `xScale`).
 *  2. For each point in sorted order, try candidate y positions:
 *     [centerY, centerY+s, centerY-s, centerY+2s, centerY-2s, …].
 *  3. Pick the first candidate where the new dot does not overlap any
 *     already-placed dot within ±(2*dotRadius) in x (early-exit on the
 *     x-sorted neighbourhood).
 *  4. Return positions in original (not sorted) input order.
 *
 * @param {number[]} values - Domain values to position (must all be finite).
 * @param {(v: number) => number} xScale - Maps a domain value to an SVG x coordinate.
 * @param {number} dotRadius - Dot radius in px; collision threshold is 2*dotRadius.
 * @param {number} trackCenterY - SVG y coordinate for the track center line.
 * @param {number} [rowSpacing] - Vertical distance between row centres (default: dotRadius * 2.2).
 * @returns {{ x: number, y: number }[]} Positions in original input order.
 */
export function beeswarmLayout(
  values,
  xScale,
  dotRadius,
  trackCenterY,
  rowSpacing = dotRadius * 2.2
) {
  if (values.length === 0) return [];

  const diameter = dotRadius * 2;
  const diameterSq = diameter * diameter;
  const xs = values.map(xScale);

  // Process in ascending x order so the neighbour list stays sorted.
  const order = xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);

  // `placed` grows in ascending x order (same as process order).
  const placed = [];
  const result = new Array(values.length);

  for (const { x, i } of order) {
    let placedY = trackCenterY;

    outer: for (let row = 0; ; row++) {
      // Row 0: centre. Row k>0: try +k then −k offsets.
      const candidates =
        row === 0
          ? [trackCenterY]
          : [trackCenterY + row * rowSpacing, trackCenterY - row * rowSpacing];

      for (const candY of candidates) {
        let overlaps = false;

        // Iterate placed in reverse: most recent items are closest in x.
        // Break as soon as we're more than one diameter away in x.
        for (let j = placed.length - 1; j >= 0; j--) {
          const p = placed[j];
          if (p.x < x - diameter) break;
          const dx = p.x - x;
          const dy = p.y - candY;
          if (dx * dx + dy * dy < diameterSq) {
            overlaps = true;
            break;
          }
        }

        if (!overlaps) {
          placedY = candY;
          break outer;
        }
      }
    }

    placed.push({ x, y: placedY });
    result[i] = { x, y: placedY };
  }

  return result;
}

/**
 * @typedef {Object} PlottedPoint
 * @property {string} id - Stable identifier for the point.
 * @property {number} x - Screen-space (post-scale) x coordinate in pixels.
 * @property {number} y - Screen-space (post-scale) y coordinate in pixels.
 */

/**
 * Return the id of the plotted point nearest to (mouseX, mouseY) within
 * `snapRadius` (Euclidean distance, in screen pixels), or null if none are in
 * range. Ties break on last-seen order (the final point at the minimum
 * distance wins). Linear scan; fine at n < ~10k.
 *
 * @param {PlottedPoint[]} points - Points in screen space (post-scale).
 * @param {number} mouseX - Pointer x coordinate in pixels.
 * @param {number} mouseY - Pointer y coordinate in pixels.
 * @param {number} snapRadius - Maximum snap distance in pixels.
 * @returns {string | null} Id of the nearest in-range point, or null.
 */
export function nearestPoint(points, mouseX, mouseY, snapRadius) {
  const snapRadiusSquared = snapRadius * snapRadius;
  let nearestId = null;
  let nearestDistanceSquared = snapRadiusSquared;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const dx = p.x - mouseX;
    const dy = p.y - mouseY;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared <= nearestDistanceSquared) {
      nearestDistanceSquared = distanceSquared;
      nearestId = p.id;
    }
  }

  return nearestId;
}
