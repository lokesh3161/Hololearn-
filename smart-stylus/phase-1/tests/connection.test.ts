import { describe, it, expect } from 'vitest';
import { StylusConnectionManager } from '../connection/StylusConnectionManager';

describe('StylusConnectionManager Connection State Machine Test Suite', () => {
  it('should transition through connecting and connected states', async () => {
    const manager = new StylusConnectionManager();
    expect(manager.getStatus()).toBe('disconnected');

    const connectPromise = manager.connect();
    expect(manager.getStatus()).toBe('connecting');

    const success = await connectPromise;
    expect(success).toBe(true);
    expect(manager.getStatus()).toBe('connected');

    manager.disconnect();
    expect(manager.getStatus()).toBe('disconnected');
  });
});
