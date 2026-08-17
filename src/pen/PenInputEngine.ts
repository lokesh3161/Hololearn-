import type { PenPoint, PointerDeviceType, PenHoverState, RawPenStroke } from './types';
import { deviceDetector } from './DeviceCapabilities';

export class PenInputEngine {
  private activePenId: number | null = null;
  private lastPoint: PenPoint | null = null;
  private isStylusActive = false;

  normalizePointerEvent(
    e: React.PointerEvent | PointerEvent,
    screenToWorld: (sx: number, sy: number) => { x: number; y: number }
  ): PenPoint[] {
    const pointerType = (e.pointerType || 'mouse') as PointerDeviceType;

    if (pointerType === 'pen') {
      deviceDetector.markStylusDetected();
      this.isStylusActive = true;
    }

    // Palm Rejection: If an active stylus is currently drawing, reject palm touches
    if (this.isStylusActive && pointerType === 'touch' && e.buttons > 0) {
      if (e.width > 25 || e.height > 25) {
        // Large contact area indicates palm touch
        return [];
      }
    }

    // High-Frequency Coalesced Events Extraction
    const nativeEvt = 'nativeEvent' in e ? (e as React.PointerEvent).nativeEvent : (e as PointerEvent);
    let rawEvents: PointerEvent[] = [nativeEvt];

    if (typeof (e as any).getCoalescedEvents === 'function') {
      try {
        const coalesced = (e as any).getCoalescedEvents();
        if (coalesced && coalesced.length > 0) {
          rawEvents = coalesced;
        }
      } catch (err) {
        // Fallback to standard event if coalesced events throw
      }
    }

    const penPoints: PenPoint[] = [];

    for (const evt of rawEvents) {
      const worldPos = screenToWorld(evt.clientX, evt.clientY);
      const timestamp = evt.timeStamp || performance.now();

      // Velocity calculation (distance / dt)
      let velocity = 0;
      if (this.lastPoint) {
        const dist = Math.hypot(worldPos.x - this.lastPoint.x, worldPos.y - this.lastPoint.y);
        const dt = Math.max(1, timestamp - this.lastPoint.timestamp);
        velocity = dist / dt;
      }

      // Pressure handling with zero-contact fallback
      let rawPressure = evt.pressure;
      if (typeof rawPressure !== 'number' || isNaN(rawPressure)) {
        rawPressure = 0.5;
      }

      // If stylus button is pressed but pressure reports 0, use velocity fallback
      if (evt.buttons > 0 && rawPressure === 0) {
        rawPressure = Math.max(0.35, Math.min(0.85, 1 - velocity * 0.15));
      }

      const penPoint: PenPoint = {
        x: worldPos.x,
        y: worldPos.y,
        pressure: Math.max(0.1, Math.min(1.0, rawPressure)),
        timestamp,
        tiltX: evt.tiltX,
        tiltY: evt.tiltY,
        twist: evt.twist,
        pointerType,
        velocity,
      };

      this.lastPoint = penPoint;
      penPoints.push(penPoint);
    }

    return penPoints;
  }

  reset(): void {
    this.activePenId = null;
    this.lastPoint = null;
  }

  setStylusActive(active: boolean): void {
    this.isStylusActive = active;
  }
}
