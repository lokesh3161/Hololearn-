export type PointerDeviceType = 'pen' | 'touch' | 'mouse';

export interface DeviceCapabilities {
  pointerEvents: boolean;
  pressure: boolean;
  tilt: boolean;
  hover: boolean;
  coalescedEvents: boolean;
  maxTouchPoints: number;
  activeStylusDetected: boolean;
}

export interface PenPoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
  tiltX?: number;
  tiltY?: number;
  twist?: number;
  pointerType: PointerDeviceType;
  velocity: number;
}

export interface RawPenStroke {
  id: string;
  points: PenPoint[];
  startTime: number;
  endTime?: number;
  pointerType: PointerDeviceType;
  minPressure: number;
  maxPressure: number;
  avgVelocity: number;
}

export interface PenHoverState {
  isHovering: boolean;
  screenPos: { x: number; y: number } | null;
  worldPos: { x: number; y: number } | null;
  pointerType: PointerDeviceType;
  pressure: number;
  tiltX: number;
  tiltY: number;
}
