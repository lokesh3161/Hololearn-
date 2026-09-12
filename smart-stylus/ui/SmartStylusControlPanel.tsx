import React, { useState, useEffect, useRef } from 'react';
import { stylusConnectionManager } from '../phase-1/connection/StylusConnectionManager';
import { holoLearnStylusAdapter } from '../phase-4/HoloLearnStylusAdapter';
import type { SmartPenPoint } from '../shared/SmartPenPoint';
import type { SmartPenStatus } from '../shared/SmartPenState';
import { Radio, Wifi, Power, RefreshCw, X } from 'lucide-react';

interface Props {
  onClose?: () => void;
}

export const SmartStylusControlPanel: React.FC<Props> = ({ onClose }) => {
  const [status, setStatus] = useState<SmartPenStatus>(stylusConnectionManager.getStatus());
  const [currentPoint, setCurrentPoint] = useState<SmartPenPoint>({
    x: 500,
    y: 300,
    pressure: 0.0,
    contact: false,
    timestamp: Date.now(),
  });

  const [contactOn, setContactOn] = useState(false);
  const [pressureVal, setPressureVal] = useState(0.65);
  const touchPadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    holoLearnStylusAdapter.initialize();

    const unsubStatus = stylusConnectionManager.subscribeStatus((newStatus) => {
      setStatus(newStatus);
    });

    const unsubPoints = stylusConnectionManager.subscribePoints((pt) => {
      setCurrentPoint(pt);
    });

    return () => {
      unsubStatus();
      unsubPoints();
    };
  }, []);

  const handleConnect = async () => {
    await stylusConnectionManager.connect();
  };

  const handleDisconnect = () => {
    stylusConnectionManager.disconnect();
  };

  const handleContactToggle = (val: boolean) => {
    setContactOn(val);
    const virtualPen = stylusConnectionManager.getVirtualStylus();
    virtualPen.setContact(val);
    if (val) {
      virtualPen.setPressure(pressureVal);
    }
  };

  const handlePressureChange = (p: number) => {
    setPressureVal(p);
    const virtualPen = stylusConnectionManager.getVirtualStylus();
    if (contactOn) {
      virtualPen.setPressure(p);
    }
  };

  const handleResetPosition = () => {
    const virtualPen = stylusConnectionManager.getVirtualStylus();
    virtualPen.setPosition(500, 300);
    virtualPen.setContact(false);
    setContactOn(false);
  };

  const handlePadPointerMove = (e: React.PointerEvent) => {
    if (!touchPadRef.current) return;
    const rect = touchPadRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const relY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    // Map 0..rect dimensions to canvas world space 0..1200 x 0..800
    const canvasX = Math.round((relX / rect.width) * 1200);
    const canvasY = Math.round((relY / rect.height) * 800);

    const virtualPen = stylusConnectionManager.getVirtualStylus();
    virtualPen.setPosition(canvasX, canvasY);

    if (e.buttons > 0) {
      if (!contactOn) {
        setContactOn(true);
        virtualPen.setContact(true);
      }
      virtualPen.setPressure(pressureVal);
    }
  };

  const handlePadPointerUp = () => {
    if (contactOn) {
      setContactOn(false);
      const virtualPen = stylusConnectionManager.getVirtualStylus();
      virtualPen.setContact(false);
    }
  };

  return (
    <div className="fixed top-16 right-6 z-50 w-80 bg-[#0c0c0c]/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-md p-4 text-white font-sans select-none animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-wider font-bold text-zinc-200">
            Smart Stylus Simulator
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Status & Transport */}
      <div className="grid grid-cols-2 gap-2 text-xs bg-white/5 p-2.5 rounded-xl border border-white/10 mb-3">
        <div>
          <div className="text-[10px] text-zinc-400 font-mono">STATUS</div>
          <div className="flex items-center gap-1.5 mt-0.5 font-semibold">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'connected' || status === 'drawing' || status === 'hovering'
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : status === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-zinc-500'
              }`}
            />
            <span className="capitalize">{status}</span>
          </div>
        </div>

        <div>
          <div className="text-[10px] text-zinc-400 font-mono">TRANSPORT</div>
          <div className="flex items-center gap-1 mt-0.5 font-mono text-[11px] text-cyan-300">
            <Wifi className="w-3 h-3" />
            <span>BLE Simulator</span>
          </div>
        </div>
      </div>

      {/* Live Readouts */}
      <div className="grid grid-cols-4 gap-1.5 mb-3 font-mono text-[11px]">
        <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
          <div className="text-[9px] text-zinc-400">X</div>
          <div className="text-zinc-200 font-bold">{currentPoint.x}</div>
        </div>
        <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
          <div className="text-[9px] text-zinc-400">Y</div>
          <div className="text-zinc-200 font-bold">{currentPoint.y}</div>
        </div>
        <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
          <div className="text-[9px] text-zinc-400">PRESS</div>
          <div className="text-zinc-200 font-bold">{currentPoint.pressure.toFixed(2)}</div>
        </div>
        <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
          <div className="text-[9px] text-zinc-400">CONTACT</div>
          <div className={`font-bold ${currentPoint.contact ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {currentPoint.contact ? 'ON' : 'OFF'}
          </div>
        </div>
      </div>

      {/* Virtual Pen Touchpad */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mb-1">
          <span>VIRTUAL PEN PAD</span>
          <span>Drag mouse to move pen</span>
        </div>
        <div
          ref={touchPadRef}
          onPointerMove={handlePadPointerMove}
          onPointerUp={handlePadPointerUp}
          className="w-full h-28 bg-[#040404] border border-white/15 rounded-xl relative overflow-hidden cursor-crosshair touch-none flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:12px_12px] opacity-30 pointer-events-none" />
          <div
            className={`absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 transition-transform pointer-events-none ${
              currentPoint.contact
                ? 'bg-emerald-400 border-white scale-125 shadow-[0_0_12px_#34d399]'
                : 'bg-cyan-500/40 border-cyan-300'
            }`}
            style={{
              left: `${(currentPoint.x / 1200) * 100}%`,
              top: `${(currentPoint.y / 800) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Pressure Slider */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
          <span>TIP PRESSURE</span>
          <span>{(pressureVal * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min="0.05"
          max="1.0"
          step="0.05"
          value={pressureVal}
          onChange={(e) => handlePressureChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
        />
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        {status === 'disconnected' ? (
          <button
            onClick={handleConnect}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow"
          >
            <Power className="w-3.5 h-3.5" />
            Connect
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="flex-1 bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-300 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Power className="w-3.5 h-3.5" />
            Disconnect
          </button>
        )}

        <button
          onClick={() => handleContactToggle(!contactOn)}
          className={`flex-1 font-bold py-2 rounded-xl text-xs transition-all border ${
            contactOn
              ? 'bg-emerald-400 text-black border-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
              : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
          }`}
        >
          Contact {contactOn ? 'ON' : 'OFF'}
        </button>

        <button
          onClick={handleResetPosition}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition-colors"
          title="Reset Position"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
