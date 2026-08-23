/**
 * Core SmartPenPoint Data Model
 * Hardware-neutral point structure transmitted by Smart Stylus (Virtual or Physical ESP32-S3).
 */
export interface SmartPenPoint {
  x: number;          // World X position (pixels or mm)
  y: number;          // World Y position (pixels or mm)
  pressure: number;   // Normalized tip pressure (0.0 = hover, 1.0 = max pressure)
  contact: boolean;   // True when tip makes physical surface contact
  timestamp: number;  // Epoch millisecond timestamp
}
