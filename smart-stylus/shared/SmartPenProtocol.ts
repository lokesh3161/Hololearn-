/**
 * Smart Stylus Binary Protocol Specifications & GATT Characteristic UUIDs
 */

export const SMART_PEN_GATT = {
  SERVICE_UUID: '183a0001-[4532-4e89-89a1-000000000001]',
  POINT_DATA_CHAR_UUID: '183a0002-[4532-4e89-89a1-000000000001]',
  CONTROL_CHAR_UUID: '183a0003-[4532-4e89-89a1-000000000001]',
  BATTERY_CHAR_UUID: '183a0004-[4532-4e89-89a1-000000000001]',
};

export interface RawPointPacket {
  header: number;       // Magic byte 0xAA
  x: number;            // Int16 (0 to 4095 or canvas width)
  y: number;            // Int16 (0 to 4095 or canvas height)
  pressure: number;     // Uint8 (0 to 255)
  contact: boolean;     // Uint8 (0 or 1)
  timestamp: number;    // Uint32
  checksum: number;     // XOR checksum
}
