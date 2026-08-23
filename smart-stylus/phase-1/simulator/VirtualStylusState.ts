import type { SmartPenPoint } from '../../shared/SmartPenPoint';
import type { SmartPenStatus } from '../../shared/SmartPenState';

export interface VirtualStylusData {
  x: number;
  y: number;
  pressure: number;
  contact: boolean;
  battery: number;
  status: SmartPenStatus;
}
