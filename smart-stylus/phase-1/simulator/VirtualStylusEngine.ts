import { VirtualStylus } from './VirtualStylus';
import { VirtualBLEDevice } from './VirtualBLEDevice';

export class VirtualStylusEngine {
  private stylus: VirtualStylus;
  private bleDevice: VirtualBLEDevice;
  private timerId: any = null;
  private sampleRateHz = 60;

  constructor(stylus: VirtualStylus, bleDevice: VirtualBLEDevice) {
    this.stylus = stylus;
    this.bleDevice = bleDevice;
  }

  public start(): void {
    if (this.timerId !== null) return;
    const intervalMs = Math.floor(1000 / this.sampleRateHz);
    this.timerId = setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  public stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public isRunning(): boolean {
    return this.timerId !== null;
  }

  public tick(): void {
    const point = this.stylus.getCurrentPoint();
    this.bleDevice.emitPoint(point);
  }
}
