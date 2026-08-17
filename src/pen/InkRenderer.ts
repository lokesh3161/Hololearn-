import type { PenPoint } from './types';

export class InkRenderer {
  renderStroke(
    ctx: CanvasRenderingContext2D,
    points: PenPoint[],
    color: string = '#ffffff',
    baseWidth: number = 3.5,
    isHighlighter: boolean = false
  ): void {
    if (!points || points.length === 0) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isHighlighter) {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = baseWidth * 3;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Pen stroke with variable pressure & velocity dynamics
    if (points.length === 1) {
      const p = points[0];
      const r = Math.max(1.5, (baseWidth * (p.pressure || 0.5)) / 2);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Variable-width quad curve rendering for smooth natural handwriting
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      const pressure = (p1.pressure + p2.pressure) / 2;
      const effectiveWidth = Math.max(1.8, baseWidth * (0.4 + pressure * 0.9));

      ctx.lineWidth = effectiveWidth;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);

      if (i < points.length - 2) {
        const p3 = points[i + 2];
        const xc = (p2.x + p3.x) / 2;
        const yc = (p2.y + p3.y) / 2;
        ctx.quadraticCurveTo(p2.x, p2.y, xc, yc);
      } else {
        ctx.lineTo(p2.x, p2.y);
      }

      ctx.stroke();
    }

    ctx.restore();
  }

  renderHoverCursor(
    ctx: CanvasRenderingContext2D,
    screenPos: { x: number; y: number },
    toolSize: number = 4
  ): void {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // screen space rendering

    // Outer subtle white ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, Math.max(4, toolSize + 2), 0, Math.PI * 2);
    ctx.stroke();

    // Inner point
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  renderSemanticShape(
    ctx: CanvasRenderingContext2D,
    obj: any,
    selected: boolean = false,
    color: string = '#ffffff',
    strokeWidth: number = 3.5
  ): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3.5, strokeWidth);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (selected) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(255,255,255,0.5)';
    }

    const geo = obj.geometry;
    if (!geo) {
      ctx.restore();
      return;
    }

    ctx.beginPath();

    switch (geo.type) {
      case 'circle':
        ctx.arc(geo.centerX, geo.centerY, geo.radius, 0, 2 * Math.PI);
        break;

      case 'ellipse':
        ctx.ellipse(
          geo.centerX,
          geo.centerY,
          geo.radiusX,
          geo.radiusY,
          geo.rotation || 0,
          0,
          2 * Math.PI
        );
        break;

      case 'rectangle':
      case 'square':
        if (geo.corners && geo.corners.length === 4) {
          ctx.moveTo(geo.corners[0].x, geo.corners[0].y);
          geo.corners.forEach((c: any, i: number) => {
            if (i > 0) ctx.lineTo(c.x, c.y);
          });
          ctx.closePath();
        } else {
          ctx.rect(geo.x, geo.y, geo.width, geo.height);
        }
        break;

      case 'triangle':
        ctx.moveTo(geo.p1.x, geo.p1.y);
        ctx.lineTo(geo.p2.x, geo.p2.y);
        ctx.lineTo(geo.p3.x, geo.p3.y);
        ctx.closePath();
        break;

      case 'line':
        ctx.moveTo(geo.startX, geo.startY);
        ctx.lineTo(geo.endX, geo.endY);
        break;

      case 'arrow': {
        ctx.moveTo(geo.startX, geo.startY);
        ctx.lineTo(geo.endX, geo.endY);
        const angle = Math.atan2(geo.endY - geo.startY, geo.endX - geo.startX);
        const hs = geo.headSize || 14;
        ctx.moveTo(geo.endX, geo.endY);
        ctx.lineTo(
          geo.endX - hs * Math.cos(angle - 0.42),
          geo.endY - hs * Math.sin(angle - 0.42)
        );
        ctx.moveTo(geo.endX, geo.endY);
        ctx.lineTo(
          geo.endX - hs * Math.cos(angle + 0.42),
          geo.endY - hs * Math.sin(angle + 0.42)
        );
        break;
      }

      case 'arc':
        ctx.arc(geo.centerX, geo.centerY, geo.radius, geo.startAngle, geo.endAngle);
        break;

      case 'polygon':
        if (geo.vertices && geo.vertices.length > 0) {
          ctx.moveTo(geo.vertices[0].x, geo.vertices[0].y);
          geo.vertices.forEach((v: any, i: number) => {
            if (i > 0) ctx.lineTo(v.x, v.y);
          });
          ctx.closePath();
        }
        break;
    }

    ctx.stroke();
    ctx.restore();
  }
}

export const inkRenderer = new InkRenderer();
