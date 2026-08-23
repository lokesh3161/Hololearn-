/**
 * Explicit State Machine for Smart Stylus System
 */
export type SmartPenStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'hovering'
  | 'contacting'
  | 'drawing'
  | 'error';

export interface SmartPenState {
  status: SmartPenStatus;
  batteryLevel?: number; // 0 to 100%
  deviceName?: string;
  errorMessage?: string;
  lastPoint?: import('./SmartPenPoint').SmartPenPoint;
}
