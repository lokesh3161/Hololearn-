import type { DeviceCapabilities } from './types';

export class DeviceCapabilityDetector {
  private capabilities: DeviceCapabilities;

  constructor() {
    this.capabilities = this.detect();
  }

  detect(): DeviceCapabilities {
    const hasPointerEvents = typeof window !== 'undefined' && 'PointerEvent' in window;
    const hasCoalesced =
      hasPointerEvents &&
      typeof PointerEvent !== 'undefined' &&
      'getCoalescedEvents' in PointerEvent.prototype;
    const maxTouchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;
    const hasHover =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(hover: hover)').matches
        : true;

    return {
      pointerEvents: hasPointerEvents,
      pressure: true, // evaluated dynamically on first pen event
      tilt: true,
      hover: hasHover,
      coalescedEvents: hasCoalesced,
      maxTouchPoints,
      activeStylusDetected: false,
    };
  }

  getCapabilities(): DeviceCapabilities {
    return this.capabilities;
  }

  markStylusDetected(): void {
    if (!this.capabilities.activeStylusDetected) {
      this.capabilities.activeStylusDetected = true;
    }
  }
}

export const deviceDetector = new DeviceCapabilityDetector();
