import React from 'react';
import { PRESET_COLORS } from '../../hooks/virtual-lab/useAnnotations';

interface ColorPaletteProps {
  currentColor: string;
  onSelectColor: (color: string) => void;
  className?: string;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  currentColor,
  onSelectColor,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-1.5 p-1 bg-zinc-900/80 rounded-xl border border-white/10 ${className}`}>
      {PRESET_COLORS.map((c) => {
        const isSelected = currentColor.toLowerCase() === c.value.toLowerCase();
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectColor(c.value)}
            aria-label={`Select ${c.name} Pen`}
            title={`Pen Color: ${c.name}`}
            className={`w-5 h-5 rounded-full transition-all relative flex items-center justify-center ${
              isSelected ? 'scale-110 ring-2 ring-white shadow-md shadow-black/50' : 'hover:scale-105 opacity-85 hover:opacity-100'
            }`}
            style={{ backgroundColor: c.value }}
          >
            {isSelected && (
              <span className="w-1.5 h-1.5 rounded-full bg-black/70 border border-white/60" />
            )}
          </button>
        );
      })}
    </div>
  );
};
