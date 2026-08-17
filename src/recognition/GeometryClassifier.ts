import type {
  StrokeMetrics,
  ShapeCandidate,
  RecognizedShapeType,
  ShapeGeometry,
  LineGeometry,
  Point,
  BoundingBox,
} from './types';
import { clamp, pct, noMatch, dist } from './utils';

export class GeometryClassifier {
  classifyAll(metrics: StrokeMetrics): ShapeCandidate[] {
    const candidates: ShapeCandidate[] = [];

    // Run all geometric shape classifiers
    candidates.push(this.classifyCircle(metrics));
    candidates.push(this.classifyEllipse(metrics));
    candidates.push(this.classifyLine(metrics));
    candidates.push(this.classifyArrow(metrics));
    candidates.push(this.classifyRectangle(metrics));
    candidates.push(this.classifyTriangle(metrics));
    candidates.push(this.classifyPolygon(metrics));
    candidates.push(this.classifyArc(metrics));

    // Sort by confidence, highest first
    let sorted = candidates
      .filter((c) => c.confidence > 0.15)
      .sort((a, b) => b.confidence - a.confidence);

    if (sorted.length === 0) return [];

    // Disambiguation Rules
    sorted = this.applyDisambiguationRules(sorted, metrics);

    return sorted;
  }

  private applyDisambiguationRules(
    sorted: ShapeCandidate[],
    m: StrokeMetrics
  ): ShapeCandidate[] {
    const result = [...sorted];

    const circle = result.find((c) => c.type === 'circle');
    const ellipse = result.find((c) => c.type === 'ellipse');
    const rectangle = result.find((c) => c.type === 'rectangle' || c.type === 'square');
    const triangle = result.find((c) => c.type === 'triangle');
    const polygon = result.find((c) => c.type === 'polygon');
    const line = result.find((c) => c.type === 'line');
    const arrow = result.find((c) => c.type === 'arrow');

    // Circle vs Triangle/Polygon
    if (circle && circle.confidence > 0.70) {
      if (triangle) triangle.confidence = 0;
      if (polygon) polygon.confidence = 0;
    }

    // Rule 1 — Circle vs Ellipse
    if (circle && ellipse && circle.confidence > 0.55 && ellipse.confidence > 0.5) {
      const isCircleAspect = m.aspectRatio >= 0.82 && m.aspectRatio <= 1.22;
      if (isCircleAspect) {
        circle.confidence = Math.max(circle.confidence, ellipse.confidence + 0.1);
      } else {
        ellipse.confidence = Math.max(ellipse.confidence, circle.confidence + 0.1);
      }
    }

    // Rule 2 — Rectangle vs Triangle
    if (rectangle && triangle && rectangle.confidence > 0.3 && triangle.confidence > 0.3) {
      const corners = this.findCornersRobust(m.points);
      const merged = this.mergeNearbyCorners(corners, m.diagonal * 0.1);
      const rCorner = this.cornerProximityRatio(m);

      if (merged.length === 3 || (merged.length >= 3 && rCorner > 0.13)) {
        triangle.confidence = Math.max(triangle.confidence, 0.85);
        rectangle.confidence = 0;
        if (polygon) polygon.confidence = 0;
      } else if (merged.length >= 4 && rCorner <= 0.12) {
        rectangle.confidence = Math.max(rectangle.confidence, 0.92);
        triangle.confidence = 0;
        if (polygon) polygon.confidence = 0;
      }
    }

    // Triangle vs Ellipse/Circle
    if (triangle && triangle.confidence > 0.5) {
      if (ellipse) ellipse.confidence *= 0.2;
      if (circle) circle.confidence *= 0.2;
    }

    // Rule 3 — Line vs Arrow
    if (line && arrow) {
      if (arrow.confidence < 0.5) {
        arrow.confidence = 0;
      }
    }

    // Re-sort after applying rules
    const finalSorted = result
      .filter((c) => c.confidence > 0.15)
      .sort((a, b) => b.confidence - a.confidence);

    // Rule 6 — Minimum gap rule
    if (finalSorted.length >= 2) {
      const gap = finalSorted[0].confidence - finalSorted[1].confidence;
      if (gap < 0.15) {
        finalSorted[0].confidence = clamp(finalSorted[0].confidence - 0.02);
      }
    }

    return finalSorted;
  }

  // ── CIRCLE CLASSIFIER — 5 INDEPENDENT METRICS ─────────────
  classifyCircle(m: StrokeMetrics): ShapeCandidate {
    if (m.diagonal < 20) return noMatch('circle');

    const { centerX, centerY, width, height } = m.boundingBox;
    const estRadius = (width + height) / 4;

    // METRIC 1: RADIAL CONSISTENCY
    const distances = m.points.map((p) => Math.hypot(p.x - centerX, p.y - centerY));
    const meanR = distances.reduce((s, d) => s + d, 0) / distances.length;
    const variance =
      distances.reduce((s, d) => s + (d - meanR) ** 2, 0) / distances.length;
    const stdDev = Math.sqrt(variance);
    const cv = meanR > 0 ? stdDev / meanR : 1;
    const radialScore = Math.max(0, 1 - cv * 4);

    // METRIC 2: ASPECT RATIO
    const ar = m.aspectRatio;
    const arScore = Math.max(0, 1 - Math.abs(1 - ar) * 2.5);

    // METRIC 3: PERIMETER vs CIRCUMFERENCE RATIO
    const expectedPerim = 2 * Math.PI * estRadius;
    const perimRatio = expectedPerim > 0 ? m.totalLength / expectedPerim : 2;
    const perimScore = Math.max(0, 1 - Math.abs(1 - perimRatio) * 2);

    // METRIC 4: ANGULAR COVERAGE (Count non-empty octants)
    const angles = m.points.map((p) => Math.atan2(p.y - centerY, p.x - centerX));
    const buckets = new Array(8).fill(0);
    angles.forEach((a) => {
      const idx = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 8) % 8;
      buckets[idx]++;
    });
    const coveredBuckets = buckets.filter((b) => b >= 1).length;
    const coverageScore = coveredBuckets >= 7 ? 1.0 : coveredBuckets >= 5 ? 0.7 : 0.3;

    // METRIC 5: CLOSURE RATIO
    const closureScore = Math.max(0, 1 - m.closureRatio * 2.5);

    // Hand-drawn circle open/overlapped tolerance (allows gaps up to 42% of diagonal)
    const isClosedLoop = m.isClosed || (coveredBuckets >= 6 && radialScore > 0.45 && m.closureRatio < 0.42);
    if (!isClosedLoop) return noMatch('circle');

    // Penalize only if box corner proximity is high (rectangle/square)
    const rCorner = this.cornerProximityRatio(m);
    const boxPenalty = rCorner < 0.12 ? 0.2 : 1.0;

    // WEIGHTED COMBINATION
    const confidence = clamp(
      (radialScore * 0.4 +
        arScore * 0.2 +
        perimScore * 0.2 +
        coverageScore * 0.1 +
        closureScore * 0.1) * boxPenalty
    );

    return {
      type: 'circle',
      confidence,
      label: `Circle — ${pct(confidence)}`,
      geometry: {
        type: 'circle',
        centerX,
        centerY,
        radius: estRadius,
      },
    };
  }

  // ── ELLIPSE CLASSIFIER ──────────────────────────────────
  classifyEllipse(m: StrokeMetrics): ShapeCandidate {
    if (m.diagonal < 20) return noMatch('ellipse');

    const { centerX, centerY, width, height } = m.boundingBox;
    const rx = width / 2,
      ry = height / 2;
    if (rx < 5 || ry < 5) return noMatch('ellipse');

    // METRIC 1: ELLIPSE EQUATION FIT
    const ellipticValues = m.points.map((p) => {
      const nx = (p.x - centerX) / rx;
      const ny = (p.y - centerY) / ry;
      return nx * nx + ny * ny;
    });
    const mean = ellipticValues.reduce((s, v) => s + v, 0) / ellipticValues.length;
    const variance =
      ellipticValues.reduce((s, v) => s + (v - mean) ** 2, 0) / ellipticValues.length;
    const fitScore = Math.max(0, 1 - Math.sqrt(variance) * 2);

    // METRIC 2: CLOSURE
    const closureScore = Math.max(0, 1 - m.closureRatio * 2.5);

    // METRIC 3: ASPECT RATIO BONUS
    const ar = m.aspectRatio;
    const ellipseBonus = ar > 1.25 || ar < 0.8 ? 1.15 : 0.85;

    // METRIC 4: COVERAGE
    const angles = m.points.map((p) => Math.atan2(p.y - centerY, p.x - centerX));
    const buckets = new Array(6).fill(0);
    angles.forEach((a) => {
      const idx = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 6) % 6;
      buckets[idx]++;
    });
    const coveredBuckets = buckets.filter((b) => b >= 1).length;
    const coverageScore = coveredBuckets >= 5 ? 1.0 : 0.5;

    const isClosedLoop = m.isClosed || (coveredBuckets >= 5 && fitScore > 0.45 && m.closureRatio < 0.42);
    if (!isClosedLoop) return noMatch('ellipse');

    // Penalize only if box corner proximity is high (rectangle/square)
    const rCorner = this.cornerProximityRatio(m);
    const boxPenalty = rCorner < 0.12 ? 0.2 : 1.0;

    const confidence = clamp(
      (fitScore * 0.5 + closureScore * 0.2 + coverageScore * 0.3) * ellipseBonus * boxPenalty
    );

    return {
      type: 'ellipse',
      confidence,
      label: `Ellipse — ${pct(confidence)}`,
      geometry: {
        type: 'ellipse',
        centerX,
        centerY,
        radiusX: rx,
        radiusY: ry,
        rotation: 0,
      },
    };
  }

  // ── RECTANGLE / SQUARE CLASSIFIER ──────────────────────
  classifyRectangle(m: StrokeMetrics): ShapeCandidate {
    if (!m.isClosed || m.diagonal < 20) return noMatch('rectangle');

    const rCorner = this.cornerProximityRatio(m);
    if (rCorner > 0.14) return noMatch('rectangle');

    const corners = this.findCornersRobust(m.points);
    const merged = this.mergeNearbyCorners(corners, m.diagonal * 0.1);

    let rectCorners: Point[];
    if (merged.length === 4) {
      rectCorners = merged;
    } else if (merged.length === 5) {
      rectCorners = this.bestFourCorners(merged, m.points);
    } else if (merged.length === 3) {
      rectCorners = this.completeFourthCorner(merged, m.boundingBox);
    } else {
      rectCorners = this.estimateRectangleCorners(m.boundingBox);
    }

    const sorted = this.sortCornersClockwise(rectCorners);

    // METRIC 1: RIGHT ANGLES AT ALL 4 CORNERS
    const angles = this.cornerAngles(sorted);
    const rightAngleScore =
      angles.reduce((s, a) => {
        const deviation = Math.abs(a - Math.PI / 2);
        return s + Math.max(0, 1 - deviation / (Math.PI / 4));
      }, 0) / 4;

    // METRIC 2: OPPOSITE SIDES PARALLEL AND EQUAL
    const sides = this.sideVectors(sorted);
    const parallelScore02 = Math.abs(this.cosAngle(sides[0], this.negate(sides[2])));
    const parallelScore13 = Math.abs(this.cosAngle(sides[1], this.negate(sides[3])));
    const equalScore02 =
      Math.min(sides[0].len, sides[2].len) / Math.max(sides[0].len, sides[2].len);
    const equalScore13 =
      Math.min(sides[1].len, sides[3].len) / Math.max(sides[1].len, sides[3].len);
    const parallelEqualScore =
      (parallelScore02 + parallelScore13 + equalScore02 + equalScore13) / 4;

    // METRIC 3: SIDES ARE STRAIGHT
    const straightScore = this.averageSideStraightness(m.points, sorted);

    // METRIC 4: CLOSURE
    const closureScore = Math.max(0, 1 - m.closureRatio * 4);

    const cornerBonus = merged.length === 4 ? 1.0 : merged.length === 3 || merged.length === 5 ? 0.95 : 0.9;

    let confidence = clamp(
      (rightAngleScore * 0.35 +
        parallelEqualScore * 0.35 +
        straightScore * 0.2 +
        closureScore * 0.1) * cornerBonus
    );

    if (m.isClosed && rCorner < 0.12) {
      confidence = Math.max(confidence, 0.92);
    }

    // Square vs Rectangle
    const w = dist(sorted[0], sorted[1]);
    const h = dist(sorted[0], sorted[3]);
    const squareRatio = Math.min(w, h) / Math.max(w, h);
    const isSquare = squareRatio > 0.88;
    const type = isSquare ? 'square' : 'rectangle';

    const { x, y, width, height } = m.boundingBox;

    return {
      type,
      confidence,
      label: `${isSquare ? 'Square' : 'Rectangle'} — ${pct(confidence)}`,
      geometry: {
        type,
        x,
        y,
        width,
        height,
        rotation: this.rectRotation(sorted),
        corners: sorted,
      },
    };
  }

  // ── TRIANGLE CLASSIFIER ─────────────────────────────────
  classifyTriangle(m: StrokeMetrics): ShapeCandidate {
    if (!m.isClosed || m.diagonal < 20) return noMatch('triangle');

    const corners = this.findCornersRobust(m.points);
    if (corners.length < 3) return noMatch('triangle');

    const merged = this.mergeNearbyCorners(corners, m.diagonal * 0.1);

    if (merged.length < 3 || merged.length > 5) {
      return noMatch('triangle');
    }

    let triCorners: Point[];
    if (merged.length === 3) {
      triCorners = merged;
    } else if (merged.length === 4) {
      triCorners = this.bestThreeCorners(merged, m.points);
    } else {
      triCorners = this.estimateTriangle(m.boundingBox);
    }

    const sorted = this.sortCornersClockwise(triCorners);

    // METRIC 1: 3 SIDES ARE STRAIGHT
    const straightScore = this.averageSideStraightness(m.points, sorted);

    // METRIC 2: INTERIOR ANGLES
    const angles = sorted.map((p, i) => {
      const prev = sorted[(i - 1 + 3) % 3];
      const next = sorted[(i + 1) % 3];
      const v1 = { x: prev.x - p.x, y: prev.y - p.y };
      const v2 = { x: next.x - p.x, y: next.y - p.y };
      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
      return mag > 0 ? Math.acos(clamp(dot / mag, -1, 1)) : 0;
    });
    const sumAngles = angles.reduce((s, a) => s + a, 0);
    const angleScore = Math.max(0, 1 - Math.abs(sumAngles - Math.PI) * 1.5);

    // METRIC 3: CLOSURE
    const closureScore = Math.max(0, 1 - m.closureRatio * 4);

    // METRIC 4: CORNER COUNT CONFIDENCE
    const cornerScore = merged.length === 3 ? 1.0 : merged.length === 4 ? 0.85 : 0.7;

    let confidence = clamp(
      straightScore * 0.35 +
        angleScore * 0.3 +
        closureScore * 0.15 +
        cornerScore * 0.2
    );

    if (m.isClosed && corners.length >= 3) {
      confidence = Math.max(confidence, 0.75);
    }

    return {
      type: 'triangle',
      confidence,
      label: `Triangle — ${pct(confidence)}`,
      geometry: {
        type: 'triangle',
        p1: sorted[0],
        p2: sorted[1],
        p3: sorted[2],
      },
    };
  }

  // ── LINE CLASSIFIER ─────────────────────────────────────
  classifyLine(m: StrokeMetrics): ShapeCandidate {
    if (m.isClosed) return noMatch('line');
    if (m.totalLength < 20) return noMatch('line');

    const sp = m.startPoint,
      ep = m.endPoint;
    const dx = ep.x - sp.x,
      dy = ep.y - sp.y;
    const endDist = Math.hypot(dx, dy);
    if (endDist < 10) return noMatch('line');

    // METRIC 1: STRAIGHTNESS
    const deviations = m.points.map((p) => {
      const t = ((p.x - sp.x) * dx + (p.y - sp.y) * dy) / (endDist * endDist);
      const projX = sp.x + t * dx,
        projY = sp.y + t * dy;
      return Math.hypot(p.x - projX, p.y - projY);
    });
    const maxDev = Math.max(...deviations);
    const avgDev = deviations.reduce((s, d) => s + d, 0) / deviations.length;
    const straightScore = Math.max(0, 1 - (avgDev / endDist) * 6 - (maxDev / endDist) * 2);

    // METRIC 2: LENGTH-TO-BBOX RATIO
    const lengthRatio = endDist / m.totalLength;
    const lengthScore = Math.max(0, lengthRatio * 1.2 - 0.2);

    // METRIC 3: ENDPOINT SEPARATION
    const separationScore = Math.min(1, endDist / (m.diagonal * 0.7));

    const confidence = clamp(
      straightScore * 0.55 + lengthScore * 0.25 + separationScore * 0.2
    );

    const angle = Math.atan2(dy, dx);

    return {
      type: 'line',
      confidence,
      label: `Line — ${pct(confidence)}`,
      geometry: {
        type: 'line',
        startX: sp.x,
        startY: sp.y,
        endX: ep.x,
        endY: ep.y,
        length: endDist,
        angle,
      },
    };
  }

  // ── ARROW CLASSIFIER ────────────────────────────────────
  classifyArrow(m: StrokeMetrics): ShapeCandidate {
    if (m.isClosed) return noMatch('arrow');
    if (m.totalLength < 30) return noMatch('arrow');

    const lineResult = this.classifyLine(m);

    const n = m.points.length;
    const tailIdx = Math.floor(n * 0.7);
    const tipIdx = Math.floor(n * 0.85);

    if (n < 20) return noMatch('arrow');

    const mainVec = {
      x: m.points[tailIdx].x - m.points[0].x,
      y: m.points[tailIdx].y - m.points[0].y,
    };
    const mainAngle = Math.atan2(mainVec.y, mainVec.x);

    let maxBranch = 0;
    for (let i = tipIdx; i < n - 1; i++) {
      const segAngle = Math.atan2(
        m.points[i + 1].y - m.points[i].y,
        m.points[i + 1].x - m.points[i].x
      );
      let diff = Math.abs(segAngle - mainAngle);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      maxBranch = Math.max(maxBranch, diff);
    }

    const hasHead = maxBranch > 0.35 && maxBranch < 2.2;
    const headScore = hasHead ? Math.max(0, 1 - Math.abs(maxBranch - 0.7) * 1.5) : 0;

    const confidence = clamp(lineResult.confidence * 0.5 + headScore * 0.5);

    if (!hasHead || confidence < 0.4) return noMatch('arrow');

    const geo = lineResult.geometry as LineGeometry;

    return {
      type: 'arrow',
      confidence,
      label: `Arrow — ${pct(confidence)}`,
      geometry: {
        type: 'arrow',
        startX: geo.startX,
        startY: geo.startY,
        endX: geo.endX,
        endY: geo.endY,
        headSize: 14,
        direction: 'forward',
      },
    };
  }

  // ── POLYGON CLASSIFIER ──────────────────────────────────
  classifyPolygon(m: StrokeMetrics): ShapeCandidate {
    if (!m.isClosed || m.diagonal < 30) return noMatch('polygon');

    const corners = this.findCornersRobust(m.points);
    if (corners.length < 5) return noMatch('polygon');

    const merged = this.mergeNearbyCorners(corners, m.diagonal * 0.08);

    if (merged.length < 5 || merged.length > 12) {
      return noMatch('polygon');
    }

    const sorted = this.sortCornersClockwise(merged);

    const straightScore = this.averageSideStraightness(m.points, sorted);
    if (straightScore < 0.6) return noMatch('polygon');

    const angles = sorted.map((p, i) => {
      const prev = sorted[(i - 1 + sorted.length) % sorted.length];
      const next = sorted[(i + 1) % sorted.length];
      const v1 = { x: prev.x - p.x, y: prev.y - p.y };
      const v2 = { x: next.x - p.x, y: next.y - p.y };
      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
      return mag > 0 ? Math.acos(clamp(dot / mag, -1, 1)) : 0;
    });
    const meanAngle = angles.reduce((s, a) => s + a, 0) / angles.length;
    const angleVariance =
      angles.reduce((s, a) => s + (a - meanAngle) ** 2, 0) / angles.length;
    const angleScore = Math.max(0, 1 - Math.sqrt(angleVariance) * 3);

    const closureScore = Math.max(0, 1 - m.closureRatio * 4);

    const confidence = clamp(
      straightScore * 0.4 + angleScore * 0.4 + closureScore * 0.2
    );

    return {
      type: 'polygon',
      confidence,
      label: `${merged.length}-sided polygon — ${pct(confidence)}`,
      geometry: {
        type: 'polygon',
        vertices: sorted,
        sides: sorted.length,
      },
    };
  }

  // ── ARC CLASSIFIER ──────────────────────────────────────
  classifyArc(m: StrokeMetrics): ShapeCandidate {
    if (m.isClosed) return noMatch('arc');
    if (m.totalLength < 30) return noMatch('arc');

    const { centerX, centerY, width, height } = m.boundingBox;
    const avgR = (width + height) / 3;
    if (avgR < 10) return noMatch('arc');

    const dists = m.points.map((p) => Math.hypot(p.x - centerX, p.y - centerY));
    const meanR = dists.reduce((s, d) => s + d, 0) / dists.length;
    const variance =
      dists.reduce((s, d) => s + (d - meanR) ** 2, 0) / dists.length;
    const cv = meanR > 0 ? Math.sqrt(variance) / meanR : 1;
    const radialScore = Math.max(0, 1 - cv * 4);

    const angles = m.points.map((p) => Math.atan2(p.y - centerY, p.x - centerX));
    let span = 0;
    for (let i = 1; i < angles.length; i++) {
      let d = angles[i] - angles[i - 1];
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      span += Math.abs(d);
    }
    const spanDeg = (span * 180) / Math.PI;
    const spanScore =
      spanDeg > 45 && spanDeg < 315 ? 1.0 : spanDeg > 30 ? 0.6 : 0.2;

    // Full round loop (span > 280 and radialScore > 0.5) is a circle/ellipse, NOT an arc!
    if (spanDeg > 280 && radialScore > 0.5) return noMatch('arc');

    const lineScore = this.classifyLine(m).confidence;
    const curvatureScore = Math.max(0, 1 - lineScore);

    const confidence = clamp(
      radialScore * 0.5 + spanScore * 0.3 + curvatureScore * 0.2
    );

    const startAngle = Math.atan2(
      m.startPoint.y - centerY,
      m.startPoint.x - centerX
    );
    const endAngle = Math.atan2(
      m.endPoint.y - centerY,
      m.endPoint.x - centerX
    );

    return {
      type: 'arc',
      confidence,
      label: `Arc — ${pct(confidence)}`,
      geometry: {
        type: 'arc',
        centerX,
        centerY,
        radius: meanR,
        startAngle,
        endAngle,
      },
    };
  }

  // ── HELPER UTILITIES FOR CURVATURE & CORNERS ─────────────
  private cornerProximityRatio(m: StrokeMetrics): number {
    if (!m.points || m.points.length === 0) return 1;
    const { x, y, width, height } = m.boundingBox;
    const diagonal = Math.hypot(width, height) || 1;
    const boxCorners = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ];

    let sumDist = 0;
    for (const c of boxCorners) {
      const sortedDists = m.points
        .map((p) => Math.hypot(p.x - c.x, p.y - c.y))
        .sort((a, b) => a - b);
      const idx = Math.min(5, sortedDists.length - 1);
      sumDist += sortedDists[idx];
    }

    return sumDist / (4 * diagonal);
  }

  private findCornersRobust(points: Point[]): Point[] {
    const n = points.length;
    if (n < 12) return [];

    const windowSize = Math.max(4, Math.floor(n / 16));
    const curvatures: number[] = [];

    for (let i = 0; i < n; i++) {
      const prev = points[(i - windowSize + n) % n];
      const curr = points[i];
      const next = points[(i + windowSize) % n];

      const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };

      const cross = v1.x * v2.y - v1.y * v2.x;
      const dot = v1.x * v2.x + v1.y * v2.y;
      curvatures.push(Math.abs(Math.atan2(cross, dot)));
    }

    // Smooth curvatures to suppress noise jitter (window = 5)
    const smoothedCurvatures = curvatures.map((c, i) => {
      const p1 = curvatures[(i - 2 + n) % n];
      const p2 = curvatures[(i - 1 + n) % n];
      const n1 = curvatures[(i + 1) % n];
      const n2 = curvatures[(i + 2) % n];
      return (p1 + p2 + c + n1 + n2) / 5;
    });

    const mean = smoothedCurvatures.reduce((s, c) => s + c, 0) / n;
    const variance = smoothedCurvatures.reduce((s, c) => s + (c - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;

    // Uniform curvature around loop (circle/ellipse) -> NO sharp corners!
    if (cv < 0.22) return [];

    const threshold = 0.4; // ~23 degrees
    const minGap = Math.floor(n / 10);
    const corners: Point[] = [];

    for (let i = 0; i < n; i++) {
      if (smoothedCurvatures[i] < threshold) continue;

      let isMax = true;
      for (let j = Math.max(0, i - minGap); j < Math.min(n, i + minGap); j++) {
        if (j !== i && smoothedCurvatures[j] >= smoothedCurvatures[i]) {
          isMax = false;
          break;
        }
      }
      if (isMax) corners.push(points[i]);
    }

    return corners;
  }

  private mergeNearbyCorners(corners: Point[], threshold: number): Point[] {
    const merged: Point[] = [];
    const used = new Set<number>();

    for (let i = 0; i < corners.length; i++) {
      if (used.has(i)) continue;
      const group = [corners[i]];
      for (let j = i + 1; j < corners.length; j++) {
        if (!used.has(j) && dist(corners[i], corners[j]) < threshold) {
          group.push(corners[j]);
          used.add(j);
        }
      }
      merged.push({
        x: group.reduce((s, p) => s + p.x, 0) / group.length,
        y: group.reduce((s, p) => s + p.y, 0) / group.length,
      });
      used.add(i);
    }
    return merged;
  }

  private sortCornersClockwise(pts: Point[]): Point[] {
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return [...pts].sort(
      (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
    );
  }

  private cornerAngles(pts: Point[]): number[] {
    return pts.map((p, i) => {
      const prev = pts[(i - 1 + pts.length) % pts.length];
      const next = pts[(i + 1) % pts.length];
      const v1 = { x: prev.x - p.x, y: prev.y - p.y };
      const v2 = { x: next.x - p.x, y: next.y - p.y };
      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
      return mag > 0 ? Math.acos(clamp(dot / mag, -1, 1)) : 0;
    });
  }

  private sideVectors(pts: Point[]) {
    return pts.map((p, i) => {
      const next = pts[(i + 1) % pts.length];
      const dx = next.x - p.x,
        dy = next.y - p.y;
      return { dx, dy, len: Math.hypot(dx, dy) };
    });
  }

  private cosAngle(a: { dx: number; dy: number }, b: { dx: number; dy: number }) {
    const dot = a.dx * b.dx + a.dy * b.dy;
    const mag = Math.hypot(a.dx, a.dy) * Math.hypot(b.dx, b.dy);
    return mag > 0 ? dot / mag : 0;
  }

  private negate(v: { dx: number; dy: number; len: number }) {
    return { dx: -v.dx, dy: -v.dy, len: v.len };
  }

  private averageSideStraightness(allPoints: Point[], corners: Point[]): number {
    let totalScore = 0;
    for (let i = 0; i < corners.length; i++) {
      const c1 = corners[i];
      const c2 = corners[(i + 1) % corners.length];
      const dx = c2.x - c1.x,
        dy = c2.y - c1.y;
      const len = Math.hypot(dx, dy);
      if (len < 1) {
        totalScore += 1;
        continue;
      }
      const segPts = allPoints.filter((p) => {
        const t = ((p.x - c1.x) * dx + (p.y - c1.y) * dy) / (len * len);
        return t >= 0 && t <= 1;
      });
      if (segPts.length < 2) {
        totalScore += 0.8;
        continue;
      }
      const devs = segPts.map((p) => Math.abs(dy * (p.x - c1.x) - dx * (p.y - c1.y)) / len);
      const avgDev = devs.reduce((s, d) => s + d, 0) / devs.length;
      totalScore += Math.max(0, 1 - avgDev / (len * 0.15));
    }
    return totalScore / corners.length;
  }

  private rectRotation(corners: Point[]): number {
    if (corners.length < 2) return 0;
    const dx = corners[1].x - corners[0].x;
    const dy = corners[1].y - corners[0].y;
    return Math.atan2(dy, dx);
  }

  private bestFourCorners(corners: Point[], allPoints: Point[]): Point[] {
    const withCurvature = corners.map((c) => {
      const nearby = allPoints.filter(
        (p) => Math.hypot(p.x - c.x, p.y - c.y) < 25
      );
      return { corner: c, count: nearby.length };
    });
    withCurvature.sort((a, b) => b.count - a.count);
    return withCurvature.slice(0, 4).map((w) => w.corner);
  }

  private completeFourthCorner(threeCorners: Point[], bbox: BoundingBox): Point[] {
    if (threeCorners.length === 3) {
      const c0 = threeCorners[0],
        c1 = threeCorners[1],
        c2 = threeCorners[2];
      const c3 = { x: c0.x + c2.x - c1.x, y: c0.y + c2.y - c1.y };
      return [c0, c1, c2, c3];
    }
    return this.estimateRectangleCorners(bbox);
  }

  private estimateRectangleCorners(bbox: BoundingBox): Point[] {
    const { x, y, width, height } = bbox;
    return [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ];
  }

  private bestThreeCorners(corners: Point[], allPoints: Point[]): Point[] {
    const withCurvature = corners.map((c) => {
      const nearby = allPoints.filter(
        (p) => Math.hypot(p.x - c.x, p.y - c.y) < 20
      );
      return { corner: c, count: nearby.length };
    });
    withCurvature.sort((a, b) => b.count - a.count);
    return withCurvature.slice(0, 3).map((w) => w.corner);
  }

  private estimateTriangle(bbox: BoundingBox): Point[] {
    return [
      { x: bbox.centerX, y: bbox.y },
      { x: bbox.x, y: bbox.y + bbox.height },
      { x: bbox.x + bbox.width, y: bbox.y + bbox.height },
    ];
  }
}
