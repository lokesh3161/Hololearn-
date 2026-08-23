import React, { useState } from 'react';
import { Geometry3DEngine, type Geometry3DData } from '../../engines/Geometry3DEngine';
import { RadialParameterDial } from './RadialParameterDial';
import { X, Box } from 'lucide-react';

interface Frameless3DObjectProps {
  id: string;
  shapeType: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  onDelete?: () => void;
}

export const Frameless3DObject: React.FC<Frameless3DObjectProps> = ({
  id,
  shapeType = 'cube',
  x,
  y,
  width = 280,
  height = 240,
  onDelete,
}) => {
  const [rotY, setRotY] = useState<number>(35);
  const [isSelected, setIsSelected] = useState<boolean>(true);

  const geoData: Geometry3DData = Geometry3DEngine.getGeometry3DData(shapeType);

  return (
    <div
      onClick={() => setIsSelected(true)}
      className={`absolute z-30 font-mono select-none group ${
        isSelected ? 'ring-1 ring-dashed ring-emerald-500/60 rounded-xl' : ''
      }`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
      }}
    >
      {isSelected && (
        <div className="absolute -top-7 left-0 right-0 flex items-center justify-between bg-zinc-950/90 border border-white/15 px-2.5 py-1 rounded-lg text-[10px] text-emerald-300 backdrop-blur-md shadow-lg pointer-events-auto">
          <span className="font-bold flex items-center gap-1">
            <Box className="w-3.5 h-3.5 text-emerald-400" />
            {geoData.name} ({geoData.volumeFormula})
          </span>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-zinc-400 hover:text-red-400 p-0.5"
              title="Delete 3D Model"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      <svg viewBox="0 0 200 160" className="w-full h-full overflow-visible">
        <g transform={`translate(100, 80) rotate(${rotY}) scale(1)`}>
          {(shapeType === 'cube' || shapeType === 'prism') && (
            <>
              <polygon points="-35,-35 35,-35 35,35 -35,35" fill="rgba(16, 185, 129, 0.15)" stroke="#10B981" strokeWidth="2.5" />
              <polygon points="-18,-52 52,-52 52,18 -18,18" fill="rgba(16, 185, 129, 0.1)" stroke="#10B981" strokeWidth="2" strokeDasharray="3 3" />
              <line x1="-35" y1="-35" x2="-18" y2="-52" stroke="#10B981" strokeWidth="2" />
              <line x1="35" y1="-35" x2="52" y2="-52" stroke="#10B981" strokeWidth="2" />
              <line x1="35" y1="35" x2="52" y2="18" stroke="#10B981" strokeWidth="2" />
              <line x1="-35" y1="35" x2="-18" y2="18" stroke="#10B981" strokeWidth="2" />
            </>
          )}

          {shapeType === 'sphere' && (
            <>
              <circle cx="0" cy="0" r="42" fill="rgba(16, 185, 129, 0.15)" stroke="#10B981" strokeWidth="2.5" />
              <ellipse cx="0" cy="0" rx="42" ry="14" fill="none" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 3" />
              <ellipse cx="0" cy="0" rx="14" ry="42" fill="none" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 3" />
            </>
          )}

          {shapeType === 'cylinder' && (
            <>
              <ellipse cx="0" cy="-35" rx="36" ry="12" fill="rgba(16, 185, 129, 0.2)" stroke="#10B981" strokeWidth="2.5" />
              <ellipse cx="0" cy="35" rx="36" ry="12" fill="rgba(16, 185, 129, 0.15)" stroke="#10B981" strokeWidth="2.5" />
              <line x1="-36" y1="-35" x2="-36" y2="35" stroke="#10B981" strokeWidth="2.5" />
              <line x1="36" y1="-35" x2="36" y2="35" stroke="#10B981" strokeWidth="2.5" />
            </>
          )}

          {(shapeType === 'cone' || shapeType === 'pyramid') && (
            <>
              <polygon points="0,-50 -40,35 40,35" fill="rgba(16, 185, 129, 0.15)" stroke="#10B981" strokeWidth="2.5" />
              <ellipse cx="0" cy="35" rx="40" ry="12" fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="3 3" />
            </>
          )}
        </g>
      </svg>

      <div className="absolute right-[-10px] bottom-[-10px]">
        <RadialParameterDial
          x={width + 30}
          y={height - 20}
          value={rotY}
          variableName="θ"
          unit="°"
          min={0}
          max={360}
          step={5}
          onChange={(val) => setRotY(val)}
        />
      </div>
    </div>
  );
};
