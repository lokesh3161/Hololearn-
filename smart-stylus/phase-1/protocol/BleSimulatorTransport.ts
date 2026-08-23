export type PacketListener = (packet: Uint8Array) => void;

export class BleSimulatorTransport {
  private listeners: Set<PacketListener> = new Set();
  private connected = false;

  public connect(): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.connected = true;
        resolve(true);
      }, 150);
    });
  }

  public disconnect(): void {
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public send(packet: Uint8Array): void {
    if (!this.connected) return;
    this.listeners.forEach((listener) => listener(packet));
  }

  public subscribe(listener: PacketListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
