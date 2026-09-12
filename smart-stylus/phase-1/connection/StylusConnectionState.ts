import type { SmartPenStatus } from '../../shared/SmartPenState';

export interface ConnectionStateInfo {
  status: SmartPenStatus;
  deviceName: string;
  transportType: 'BLE_SIMULATOR' | 'PHYSICAL_BLE';
  batteryLevel: number;
}
