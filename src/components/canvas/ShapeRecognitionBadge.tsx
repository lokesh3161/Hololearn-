import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, X } from 'lucide-react';
import type { RecognitionResult } from '../../recognition/types';

interface ShapeRecognitionBadgeProps {
  result: RecognitionResult | null;
  transform: { x: number; y: number; zoom: number };
  onConvert: () => void;
  onDismiss: () => void;
  longPressProgress: number; // 0.0 to 1.0
  longPressPos: { x: number; y: number } | null;
}

export const ShapeRecognitionBadge: React.FC<ShapeRecognitionBadgeProps> = ({
  result,
  transform,
  onConvert,
  onDismiss,
  longPressProgress,
  longPressPos,
}) => {
  // Convert canvas world coordinates to screen DOM coordinates
  let top = 12;
  let left = 12;

  if (result && result.metrics) {
    const bbox = result.metrics.boundingBox;
    left = Math.max(12, bbox.x * transform.zoom + transform.x);
    top = Math.max(12, bbox.y * transform.zoom + transform.y - 46);
  }

  return (
    <>
      {/* Radial Long Press Arc Progress Indicator */}
      {longPressProgress > 0 && longPressPos && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: longPressPos.x, top: longPressPos.y }}
        >
          <svg className="w-12 h-12">
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="2"
              fill="none"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="#ffffff"
              strokeWidth="2.5"
              fill="none"
              strokeDasharray={125.6}
              strokeDashoffset={125.6 * (1 - longPressProgress)}
              strokeLinecap="round"
              transform="rotate(-90 24 24)"
            />
          </svg>
        </div>
      )}

      {/* Floating Monochrome Shape Suggestion Card */}
      <AnimatePresence>
        {result && result.best && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              top: `${top}px`,
              left: `${left}px`,
              zIndex: 45,
            }}
            className="bg-[#0a0a0a]/95 border border-white/15 rounded-xl shadow-2xl px-3 py-2 text-[11px] font-sans text-white/90 backdrop-blur-md flex items-center gap-3 select-none pointer-events-auto"
          >
            <div className="flex items-center gap-1.5 font-mono text-white">
              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
              <span className="capitalize font-semibold text-white">
                {result.best.confidence < 0.85 ? 'Possible ' : ''}
                {result.best.type}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                · {Math.round(result.best.confidence * 100)}%
              </span>
            </div>

            <div className="h-3 w-[1px] bg-white/15" />

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
                Hold to convert
              </span>
              <button
                onClick={onConvert}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white text-black font-bold hover:bg-zinc-200 transition-colors active:scale-95 text-[11px] shadow"
              >
                <Check className="w-3.5 h-3.5 text-black" />
                <span>Convert</span>
              </button>
              <button
                onClick={onDismiss}
                className="p-0.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
