import type { SmartPenPoint } from '../../shared/SmartPenPoint';
import { SMART_PEN_CONSTANTS } from '../../shared/SmartPenConstants';

export class BleMessageEncoder {
  /**
   * Encodes a SmartPenPoint into a 14-byte Uint8Array binary BLE packet.
   */
  public static encode(point: SmartPenPoint): Uint8Array {
    const buffer = new ArrayBuffer(14);
    const view = new DataView(buffer);

    // Byte 0: Header
    view.setUint8(0, SMART_PEN_CONSTANTS.MAGIC_HEADER_BYTE);

    // Byte 1-2: X (Uint16)
    view.setUint16(1, Math.max(0, Math.round(point.x)), false);

    // Byte 3-4: Y (Uint16)
    view.setUint16(3, Math.max(0, Math.round(point.y)), false);

    // Byte 5: Pressure (Uint8 0-255)
    const rawPress = Math.max(0, Math.min(255, Math.round(point.pressure * 255)));
    view.setUint8(5, rawPress);

    // Byte 6: Contact (Uint8 0 or 1)
    view.setUint8(6, point.contact ? 1 : 0);

    // Byte 7-10: Timestamp (Uint32 modulo)
    view.setUint32(7, point.timestamp % 4294967296, false);

    // Calculate XOR checksum over bytes 0..10
    let checksum = 0;
    const bytes = new Uint8Array(buffer, 0, 11);
    for (let i = 0; i < bytes.length; i++) {
      checksum ^= bytes[i];
    }
    view.setUint8(11, checksum);

    return new Uint8Array(buffer, 0, 12);
  }
}
