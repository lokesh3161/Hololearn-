import { stylusConnectionManager } from '../phase-1/connection/StylusConnectionManager';
import type { SmartPenPoint } from '../shared/SmartPenPoint';
import { useBoardStore } from '../../src/store/boardStore';
import type { CanvasObject, Point } from '../../src/types/canvas';

export class HoloLearnStylusAdapter {
  private activeStrokePoints: Point[] = [];
  private isContacting = false;
  private unsubscribePoints: (() => void) | null = null;

  public initialize(): void {
    if (this.unsubscribePoints) return;

    this.unsubscribePoints = stylusConnectionManager.subscribePoints((smartPoint) => {
      this.handleSmartPoint(smartPoint);
    });
  }

  public destroy(): void {
    if (this.unsubscribePoints) {
      this.unsubscribePoints();
      this.unsubscribePoints = null;
    }
  }

  private handleSmartPoint(p: SmartPenPoint): void {
    const store = useBoardStore.getState();

    // Map SmartPenPoint to Canvas Point coordinate
    const canvasPoint: Point = {
      x: p.x,
      y: p.y,
      pressure: p.pressure,
      timestamp: p.timestamp,
    };

    if (p.contact) {
      // Contact Started or Moving
      if (!this.isContacting) {
        this.isContacting = true;
        this.activeStrokePoints = [canvasPoint];
      } else {
        this.activeStrokePoints.push(canvasPoint);
      }
    } else {
      // Contact Released: Commit Raw Digital Ink Stroke to boardStore
      if (this.isContacting) {
        this.isContacting = false;

        if (this.activeStrokePoints.length > 0) {
          const pts = [...this.activeStrokePoints];

          let minX = pts[0].x;
          let maxX = pts[0].x;
          let minY = pts[0].y;
          let maxY = pts[0].y;

          for (const pt of pts) {
            if (pt.x < minX) minX = pt.x;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.y > maxY) maxY = pt.y;
          }

          const width = Math.max(10, maxX - minX);
          const height = Math.max(10, maxY - minY);

          store.pushHistory();

          const strokeObj: CanvasObject = {
            id: `stylus-stroke-${Date.now()}`,
            type: 'stroke',
            points: pts,
            x: minX,
            y: minY,
            width,
            height,
            strokeColor: store.strokeColor || '#ffffff',
            strokeWidth: Math.max(3.5, store.strokeWidth),
            opacity: store.opacity || 1,
            zIndex: store.objects.length + 1,
          };

          store.addObject(strokeObj);
          this.activeStrokePoints = [];
        }
      }
    }
  }
}

export const holoLearnStylusAdapter = new HoloLearnStylusAdapter();
