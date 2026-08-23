import { BleSimulatorTransport } from '../protocol/BleSimulatorTransport';
import { BleMessageEncoder } from '../protocol/BleMessageEncoder';
import type { SmartPenPoint } from '../../shared/SmartPenPoint';

export class VirtualBLEDevice {
  private transport: BleSimulatorTransport;

  constructor(transport: BleSimulatorTransport) {
    this.transport = transport;
  }

  public emitPoint(point: SmartPenPoint): void {
    if (!this.transport.isConnected()) return;
    const binaryPacket = BleMessageEncoder.encode(point);
    this.transport.send(binaryPacket);
  }
}
