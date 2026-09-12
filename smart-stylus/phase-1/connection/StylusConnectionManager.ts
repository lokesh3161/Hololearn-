import { BleSimulatorTransport } from '../protocol/BleSimulatorTransport';
import { BleMessageDecoder } from '../protocol/BleMessageDecoder';
import { VirtualStylus } from '../simulator/VirtualStylus';
import { VirtualBLEDevice } from '../simulator/VirtualBLEDevice';
import { VirtualStylusEngine } from '../simulator/VirtualStylusEngine';
import type { SmartPenPoint } from '../../shared/SmartPenPoint';
import type { SmartPenStatus } from '../../shared/SmartPenState';

export type PointStreamListener = (point: SmartPenPoint) => void;
export type StatusChangeListener = (status: SmartPenStatus) => void;

export class StylusConnectionManager {
  private transport: BleSimulatorTransport;
  private virtualStylus: VirtualStylus;
  private virtualBLEDevice: VirtualBLEDevice;
  private engine: VirtualStylusEngine;

  private status: SmartPenStatus = 'disconnected';
  private pointListeners: Set<PointStreamListener> = new Set();
  private statusListeners: Set<StatusChangeListener> = new Set();

  constructor() {
    this.transport = new BleSimulatorTransport();
    this.virtualStylus = new VirtualStylus();
    this.virtualBLEDevice = new VirtualBLEDevice(this.transport);
    this.engine = new VirtualStylusEngine(this.virtualStylus, this.virtualBLEDevice);

    this.transport.subscribe((rawPacket) => {
      const decodedPoint = BleMessageDecoder.decode(rawPacket);
      if (decodedPoint) {
        // Update explicit state status (hovering vs contacting vs drawing)
        if (this.status !== 'disconnected' && this.status !== 'connecting') {
          const nextStatus: SmartPenStatus = decodedPoint.contact ? 'drawing' : 'hovering';
          this.setStatus(nextStatus);
        }
        this.emitPoint(decodedPoint);
      }
    });
  }

  public async connect(): Promise<boolean> {
    this.setStatus('connecting');
    const success = await this.transport.connect();
    if (success) {
      this.setStatus('connected');
      this.engine.start();
      return true;
    } else {
      this.setStatus('error');
      return false;
    }
  }

  public disconnect(): void {
    this.engine.stop();
    this.transport.disconnect();
    this.setStatus('disconnected');
  }

  public isConnected(): boolean {
    return this.transport.isConnected();
  }

  public getStatus(): SmartPenStatus {
    return this.status;
  }

  public getVirtualStylus(): VirtualStylus {
    return this.virtualStylus;
  }

  public subscribePoints(listener: PointStreamListener): () => void {
    this.pointListeners.add(listener);
    return () => {
      this.pointListeners.delete(listener);
    };
  }

  public subscribeStatus(listener: StatusChangeListener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public emitHardwarePoint(point: SmartPenPoint): void {
    if (this.status !== 'connected' && this.status !== 'drawing' && this.status !== 'hovering') {
      this.setStatus('connected');
    }
    const nextStatus: SmartPenStatus = point.contact ? 'drawing' : 'hovering';
    this.setStatus(nextStatus);
    this.emitPoint(point);
  }

  private setStatus(status: SmartPenStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.statusListeners.forEach((l) => l(status));
    }
  }

  private emitPoint(point: SmartPenPoint): void {
    this.pointListeners.forEach((l) => l(point));
  }
}

export const stylusConnectionManager = new StylusConnectionManager();
