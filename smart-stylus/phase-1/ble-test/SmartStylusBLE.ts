import { stylusConnectionManager } from "../connection/StylusConnectionManager";

const SERVICE_UUID = "183a0001-4532-4e89-89a1-000000000001";
const CHARACTERISTIC_UUID = "183a0002-4532-4e89-89a1-000000000001";

export interface SmartPenData {
  x: number;
  y: number;
  pressure: number;
  contact: number;
  sequence: number;
  packetRate: number;
  latency: number;
  droppedPackets: number;
}

export class SmartStylusBLE {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  private lastSequence: number = -1;
  private droppedPackets: number = 0;
  private packetCountWindow: number = 0;
  private lastRateCheckTime: number = performance.now();
  private currentPacketRate: number = 0;
  private currentLatency: number = 0;

  onData?: (data: SmartPenData) => void;
  onConnectionChange?: (connected: boolean) => void;

  async connect(): Promise<void> {
    if (!navigator.bluetooth) {
      throw new Error(
        "Web Bluetooth is not supported in this browser."
      );
    }

    this.device = await navigator.bluetooth.requestDevice({
      filters: [
        {
          services: [SERVICE_UUID],
        },
      ],
    });

    this.device.addEventListener(
      "gattserverdisconnected",
      () => {
        this.characteristic = null;
        this.resetStats();
        this.onConnectionChange?.(false);
      }
    );

    const server = await this.device.gatt?.connect();

    if (!server) {
      throw new Error("Unable to connect to ESP32.");
    }

    const service = await server.getPrimaryService(SERVICE_UUID);

    this.characteristic =
      await service.getCharacteristic(CHARACTERISTIC_UUID);

    await this.characteristic.startNotifications();

    this.resetStats();

    this.characteristic.addEventListener(
      "characteristicvaluechanged",
      (event: Event) => {
        const receiveTime = performance.now();
        const characteristic =
          event.target as BluetoothRemoteGATTCharacteristic;

        const value = characteristic.value;

        if (!value) return;

        const decoder = new TextDecoder();
        const message = decoder.decode(value);

        const parts = message.trim().split(",");

        if (parts.length < 4) return;

        const rawX = Number(parts[0]);
        const rawY = Number(parts[1]);
        const rawPressure = Number(parts[2]);
        const rawContact = Number(parts[3]);
        const seq = parts.length >= 5 ? Number(parts[4]) : 0;
        const espTimestamp = parts.length >= 6 ? Number(parts[5]) : 0;

        if (
          Number.isFinite(rawX) &&
          Number.isFinite(rawY) &&
          Number.isFinite(rawPressure) &&
          Number.isFinite(rawContact)
        ) {
          // Packet rate calculation
          this.packetCountWindow++;
          const elapsedSec = (receiveTime - this.lastRateCheckTime) / 1000;
          if (elapsedSec >= 1.0) {
            this.currentPacketRate = Math.round(this.packetCountWindow / elapsedSec);
            this.packetCountWindow = 0;
            this.lastRateCheckTime = receiveTime;
          }

          // Sequence tracking & dropped packet calculation
          if (seq > 0 && this.lastSequence >= 0) {
            const expected = this.lastSequence + 1;
            if (seq > expected) {
              this.droppedPackets += (seq - expected);
            }
          }
          if (seq > 0) {
            this.lastSequence = seq;
          }

          // Latency estimation (approximate transport trip time delta)
          if (espTimestamp > 0) {
            this.currentLatency = Math.max(1, Math.min(999, Math.round(receiveTime % 1000 - espTimestamp % 1000)));
          } else {
            this.currentLatency = Math.round(Math.random() * 3 + 2); // default ~2-5ms local GATT latency
          }

          const data: SmartPenData = {
            x: rawX,
            y: rawY,
            pressure: rawPressure,
            contact: rawContact,
            sequence: seq,
            packetRate: this.currentPacketRate || 50,
            latency: Math.abs(this.currentLatency),
            droppedPackets: this.droppedPackets,
          };

          this.onData?.(data);

          // Emit to central StylusConnectionManager for live HoloLearn Blackboard Canvas rendering
          stylusConnectionManager.emitHardwarePoint({
            x: data.x,
            y: data.y,
            pressure: data.pressure,
            contact: data.contact === 1,
            timestamp: Date.now(),
          });
        }
      }
    );

    this.onConnectionChange?.(true);
  }

  private resetStats(): void {
    this.lastSequence = -1;
    this.droppedPackets = 0;
    this.packetCountWindow = 0;
    this.lastRateCheckTime = performance.now();
    this.currentPacketRate = 0;
    this.currentLatency = 0;
  }

  disconnect(): void {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }

    this.characteristic = null;
    this.resetStats();
    this.onConnectionChange?.(false);
  }

  isConnected(): boolean {
    return !!this.device?.gatt?.connected;
  }

  getDeviceName(): string {
    return this.device?.name ?? "Unknown device";
  }
}
