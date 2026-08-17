import React from 'react';
import type { PenPoint, PointerDeviceType, DeviceCapabilities } from './types';
import { deviceDetector } from './DeviceCapabilities';

interface PenDiagnosticsPanelProps {
  lastPenPoint: PenPoint | null;
  activePointerType: PointerDeviceType;
  isHovering: boolean;
  onClose?: () => void;
}

export const PenDiagnosticsPanel: React.FC<PenDiagnosticsPanelProps> = ({
  lastPenPoint,
  activePointerType,
  isHovering,
  onClose,
}) => {
  const caps = deviceDetector.getCapabilities();

  return (
    <div className="absolute top-16 left-4 z-40 bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl p-3.5 text-white font-mono text-[10px] w-64 shadow-2xl space-y-2 pointer-events-auto select-none">
      <div className="flex items-center justify-between pb-1 border-b border-white/15">
        <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Active Pen Diagnostics
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white px-1 text-[10px]"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-zinc-300">
        <div>
          <span className="text-zinc-500">Pointer Type:</span>{' '}
          <span className="text-white font-bold">{activePointerType.toUpperCase()}</span>
        </div>
        <div>
          <span className="text-zinc-500">Pressure:</span>{' '}
          <span className="text-white font-bold">
            {lastPenPoint ? lastPenPoint.pressure.toFixed(2) : '0.00'}
          </span>
        </div>
        <div>
          <span className="text-zinc-500">Tilt (X/Y):</span>{' '}
          <span className="text-white font-bold">
            {lastPenPoint ? `${lastPenPoint.tiltX || 0}° / ${lastPenPoint.tiltY || 0}°` : '0° / 0°'}
          </span>
        </div>
        <div>
          <span className="text-zinc-500">Velocity:</span>{' '}
          <span className="text-white font-bold">
            {lastPenPoint ? lastPenPoint.velocity.toFixed(2) : '0.00'}
          </span>
        </div>
        <div>
          <span className="text-zinc-500">Hovering:</span>{' '}
          <span className={isHovering ? 'text-white font-bold' : 'text-zinc-500'}>
            {isHovering ? 'Active' : 'False'}
          </span>
        </div>
        <div>
          <span className="text-zinc-500">Coalesced:</span>{' '}
          <span className={caps.coalescedEvents ? 'text-white font-bold' : 'text-zinc-500'}>
            {caps.coalescedEvents ? 'Supported' : 'False'}
          </span>
        </div>
      </div>

      <div className="pt-1.5 border-t border-white/10 text-[9px] text-zinc-400 flex items-center justify-between">
        <span>Stylus Hardware: {caps.activeStylusDetected ? 'DETECTED' : 'READY'}</span>
        <span>Max Touch: {caps.maxTouchPoints}</span>
      </div>
    </div>
  );
};
