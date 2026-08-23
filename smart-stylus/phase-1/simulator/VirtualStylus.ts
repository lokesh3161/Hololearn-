import type { SmartPenPoint } from '../../shared/SmartPenPoint';

export class VirtualStylus {
  private x = 500;
  private y = 300;
  private pressure = 0.0;
  private contact = false;

  public setPosition(x: number, y: number): void {
    this.x = Math.max(0, x);
    this.y = Math.max(0, y);
  }

  public setPressure(pressure: number): void {
    this.pressure = Math.max(0.0, Math.min(1.0, pressure));
  }

  public setContact(contact: boolean): void {
    this.contact = contact;
    if (contact && this.pressure === 0) {
      this.pressure = 0.65;
    } else if (!contact) {
      this.pressure = 0.0;
    }
  }

  public getCurrentPoint(): SmartPenPoint {
    return {
      x: this.x,
      y: this.y,
      pressure: this.pressure,
      contact: this.contact,
      timestamp: Date.now(),
    };
  }

  public reset(): void {
    this.x = 500;
    this.y = 300;
    this.pressure = 0.0;
    this.contact = false;
  }
}
