import type { SmartPenPoint } from '../shared/SmartPenPoint';

export class SmartPenInputEngine {
  private buffer: SmartPenPoint[] = [];
  private maxBufferSize = 120; // 2 seconds @ 60 FPS

  public pushPoint(point: SmartPenPoint): void {
    this.buffer.push(point);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
  }

  public getBuffer(): SmartPenPoint[] {
    return [...this.buffer];
  }

  public clear(): void {
    this.buffer = [];
  }
}
