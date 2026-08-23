import type { SmartPenPoint } from '../../shared/SmartPenPoint';
import { SMART_PEN_CONSTANTS } from '../../shared/SmartPenConstants';

export class BleMessageDecoder {
  /**
   * Decodes a binary Uint8Array packet into a validated SmartPenPoint object.
   */
  public static decode(data: Uint8Array): SmartPenPoint | null {
    if (!data || data.length < 12) return null;

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    // Verify magic header
    if (view.getUint8(0) !== SMART_PEN_CONSTANTS.MAGIC_HEADER_BYTE) {
      return null;
    }

    // Verify XOR checksum
    let checksum = 0;
    for (let i = 0; i < 11; i++) {
      checksum ^= data[i];
    }

    if (checksum !== view.getUint8(11)) {
      return null;
    }

    const x = view.getUint16(1, false);
    const y = view.getUint16(3, false);
    const rawPressure = view.getUint8(5);
    const contact = view.getUint8(6) === 1;
    const timestamp = view.getUint32(7, false);

    return {
      x,
      y,
      pressure: Math.max(0.0, Math.min(1.0, rawPressure / 255)),
      contact,
      timestamp,
    };
  }
}
