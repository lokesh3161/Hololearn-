import { describe, it, expect } from 'vitest';
import { BleMessageEncoder } from '../protocol/BleMessageEncoder';
import { BleMessageDecoder } from '../protocol/BleMessageDecoder';
import type { SmartPenPoint } from '../../shared/SmartPenPoint';

describe('Smart Stylus BLE Binary Protocol Test Suite', () => {
  it('should encode and decode a valid SmartPenPoint with zero loss', () => {
    const inputPoint: SmartPenPoint = {
      x: 482,
      y: 291,
      pressure: 0.75,
      contact: true,
      timestamp: 1720000000100,
    };

    const encoded = BleMessageEncoder.encode(inputPoint);
    expect(encoded).toBeInstanceOf(Uint8Array);
    expect(encoded.length).toBe(12);

    const decoded = BleMessageDecoder.decode(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.x).toBe(482);
    expect(decoded!.y).toBe(291);
    expect(decoded!.contact).toBe(true);
    expect(Math.abs(decoded!.pressure - 0.75)).toBeLessThan(0.02);
  });

  it('should reject corrupted packets with checksum mismatch', () => {
    const inputPoint: SmartPenPoint = {
      x: 100,
      y: 200,
      pressure: 0.5,
      contact: false,
      timestamp: 1000,
    };

    const encoded = BleMessageEncoder.encode(inputPoint);
    // Corrupt byte 2
    encoded[2] = encoded[2] ^ 0xff;

    const decoded = BleMessageDecoder.decode(encoded);
    expect(decoded).toBeNull();
  });
});
