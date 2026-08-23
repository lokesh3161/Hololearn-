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
      ctx.lineWidth = Math.max(1, baseWidth * 3);
      ctx.beginPath();
      ctx.moveTo(points[0].x || 0, points[0].y || 0);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x || 0, points[i].y || 0);
      }
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Pen stroke with variable pressure & velocity dynamics
    if (points.length === 1) {
      const p = points[0];
      const press = typeof p.pressure === 'number' && !isNaN(p.pressure) ? p.pressure : 0.5;
      const r = Math.max(1.5, (baseWidth * press) / 2);
      ctx.beginPath();
      ctx.arc(p.x || 0, p.y || 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Variable-width quad curve rendering for smooth natural handwriting
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (!p1 || !p2) continue;

      const p1Press = typeof p1.pressure === 'number' && !isNaN(p1.pressure) && p1.pressure > 0 ? p1.pressure : 0.5;
      const p2Press = typeof p2.pressure === 'number' && !isNaN(p2.pressure) && p2.pressure > 0 ? p2.pressure : 0.5;
      const pressure = (p1Press + p2Press) / 2;
      const effectiveWidth = Math.max(1.8, baseWidth * (0.4 + pressure * 0.9));

      ctx.lineWidth = isNaN(effectiveWidth) ? baseWidth : effectiveWidth;
      ctx.beginPath();
      ctx.moveTo(p1.x || 0, p1.y || 0);

      if (i < points.length - 2 && points[i + 2]) {
        const p3 = points[i + 2];
        const xc = ((p2.x || 0) + (p3.x || 0)) / 2;
        const yc = ((p2.y || 0) + (p3.y || 0)) / 2;
        ctx.quadraticCurveTo(p2.x || 0, p2.y || 0, xc, yc);
      } else {
        ctx.lineTo(p2.x || 0, p2.y || 0);
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
    if (!screenPos) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // screen space rendering

    // Outer subtle white ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(screenPos.x || 0, screenPos.y || 0, Math.max(4, toolSize + 2), 0, Math.PI * 2);
    ctx.stroke();

    // Inner point
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(screenPos.x || 0, screenPos.y || 0, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * MS Paint Style Square Eraser Box Cursor
   */
  renderEraserCursor(
    ctx: CanvasRenderingContext2D,
    screenPos: { x: number; y: number },
    size: number = 28
  ): void {
    if (!screenPos) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // screen space rendering

    const half = size / 2;
    const x = screenPos.x - half;
    const y = screenPos.y - half;

    // Outer sharp contrast border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x - 0.5, y - 0.5, size + 1, size + 1);

    // Inner crisp white square fill with subtle gray border (Windows Paint style)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);

    ctx.restore();
  }

  /**
   * Interactive 2D & 3D Vector Shape Renderer
   */
  renderShape(
    ctx: CanvasRenderingContext2D,
    subtype: string,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string = '#ffffff',
    strokeWidth: number = 3.5
  ): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2.5, strokeWidth);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();

    const w = Math.max(10, width);
    const h = Math.max(10, height);

    switch (subtype) {
      case 'circle': {
        const radius = Math.min(Math.abs(w), Math.abs(h)) / 2;
        ctx.arc(x + w / 2, y + h / 2, radius, 0, Math.PI * 2);
        break;
      }

      case 'rectangle':
      case 'square': {
        const rectW = subtype === 'square' ? Math.min(Math.abs(w), Math.abs(h)) : w;
        const rectH = subtype === 'square' ? Math.min(Math.abs(w), Math.abs(h)) : h;
        ctx.rect(x, y, rectW, rectH);
        break;
      }

      case 'triangle': {
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        break;
      }

      case 'line': {
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        break;
      }

      case 'arrow': {
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        const angle = Math.atan2(h, w);
        const head = 14;
        ctx.moveTo(x + w, y + h);
        ctx.lineTo(x + w - head * Math.cos(angle - 0.45), y + h - head * Math.sin(angle - 0.45));
        ctx.moveTo(x + w, y + h);
        ctx.lineTo(x + w - head * Math.cos(angle + 0.45), y + h - head * Math.sin(angle + 0.45));
        break;
      }

      case 'cube': {
        const off = Math.min(w, h) * 0.3;
        // Front square
        ctx.rect(x, y + off, w - off, h - off);
        // Back square
        ctx.rect(x + off, y, w - off, h - off);
        // Connecting edges
        ctx.moveTo(x, y + off);
        ctx.lineTo(x + off, y);
        ctx.moveTo(x + w - off, y + off);
        ctx.lineTo(x + w, y);
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + off, y + h - off);
        ctx.moveTo(x + w - off, y + h);
        ctx.lineTo(x + w, y + h - off);
        break;
      }

      case 'cylinder': {
        const rx = w / 2;
        const ry = h * 0.15;
        // Top ellipse
        ctx.ellipse(x + rx, y + ry, rx, ry, 0, 0, Math.PI * 2);
        // Bottom ellipse
        ctx.ellipse(x + rx, y + h - ry, rx, ry, 0, 0, Math.PI * 2);
        // Vertical sides
        ctx.moveTo(x, y + ry);
        ctx.lineTo(x, y + h - ry);
        ctx.moveTo(x + w, y + ry);
        ctx.lineTo(x + w, y + h - ry);
        break;
      }

      case 'cone': {
        const rx = w / 2;
        const ry = h * 0.15;
        // Bottom ellipse
        ctx.ellipse(x + rx, y + h - ry, rx, ry, 0, 0, Math.PI * 2);
        // Diagonal sides to apex
        ctx.moveTo(x + rx, y);
        ctx.lineTo(x, y + h - ry);
        ctx.moveTo(x + rx, y);
        ctx.lineTo(x + w, y + h - ry);
        break;
      }

      default:
        ctx.rect(x, y, w, h);
        break;
    }

    ctx.stroke();
    ctx.restore();
  }
}

export const inkRenderer = new InkRenderer();
