import { describe, it, expect } from 'vitest';
import { VirtualStylus } from '../simulator/VirtualStylus';

describe('VirtualStylus Hardware Simulator Test Suite', () => {
  it('should update position and generate correct hover points', () => {
    const stylus = new VirtualStylus();
    stylus.setPosition(650, 420);

    const point = stylus.getCurrentPoint();
    expect(point.x).toBe(650);
    expect(point.y).toBe(420);
    expect(point.contact).toBe(false);
    expect(point.pressure).toBe(0.0);
  });

  it('should update contact state and pressure dynamics', () => {
    const stylus = new VirtualStylus();
    stylus.setPosition(300, 150);
    stylus.setContact(true);

    const point = stylus.getCurrentPoint();
    expect(point.contact).toBe(true);
    expect(point.pressure).toBeGreaterThan(0.0);

    stylus.setContact(false);
    const pointReleased = stylus.getCurrentPoint();
    expect(pointReleased.contact).toBe(false);
    expect(pointReleased.pressure).toBe(0.0);
  });
});
