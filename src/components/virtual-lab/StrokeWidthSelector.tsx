import React from 'react';
import { STROKE_WIDTHS } from '../../hooks/virtual-lab/useAnnotations';

interface StrokeWidthSelectorProps {
  currentWidth: number;
  onSelectWidth: (width: number) => void;
  className?: string;
}

export const StrokeWidthSelector: React.FC<StrokeWidthSelectorProps> = ({
  currentWidth,
  onSelectWidth,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-1 p-1 bg-zinc-900/80 rounded-xl border border-white/10 ${className}`}>
      {STROKE_WIDTHS.map((sw) => {
        const isSelected = currentWidth === sw.value;
        return (
          <button
            key={sw.id}
            type="button"
            onClick={() => onSelectWidth(sw.value)}
            aria-label={`Select ${sw.label} Stroke Width (${sw.value}px)`}
            title={`${sw.label} Thickness (${sw.value}px)`}
            className={`px-2 py-1 rounded-lg transition-all flex items-center justify-center ${
              isSelected
                ? 'bg-white text-black font-bold shadow'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span
              className="rounded-full bg-current inline-block"
              style={{
                width: Math.max(3, sw.value * 1.5),
                height: Math.max(3, sw.value * 1.5),
              }}
            />
          </button>
        );
      })}
    </div>
  );
};
