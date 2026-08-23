import React, { useState, useMemo } from 'react';
import { Geometry3DEngine, type Geometry3DData } from '../../engines/Geometry3DEngine';
import { RotateCw, X, Box, Eye, Layers } from 'lucide-react';

interface Interactive3DViewerProps {
  shapeType: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  onClose?: () => void;
}

export const Interactive3DViewer: React.FC<Interactive3DViewerProps> = ({
  shapeType,
  x,
  y,
  width = 360,
  height = 280,
  onClose,
}) => {
  const [rotX, setRotX] = useState<number>(25);
  const [rotY, setRotY] = useState<number>(35);
  const [isWireframe, setIsWireframe] = useState<boolean>(false);

  const geoData: Geometry3DData = useMemo(() => {
    return Geometry3DEngine.getGeometry3DData(shapeType);
  }, [shapeType]);

  return (
    <div
      className="absolute z-30 bg-zinc-950/95 border-2 border-emerald-500/50 rounded-2xl p-3 font-mono text-xs shadow-2xl text-white select-none backdrop-blur-md"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-emerald-300 text-xs">{geoData.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsWireframe(!isWireframe)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
              isWireframe ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-zinc-800 text-zinc-300 border-white/10'
            }`}
          >
            {isWireframe ? 'Wireframe' : 'Solid'}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3D SVG Projection Renderer */}
      <div className="relative w-full h-36 bg-black/80 rounded-xl border border-white/15 overflow-hidden flex items-center justify-center">
        <svg viewBox="0 0 200 140" className="w-full h-full">
          <g transform={`translate(100, 70) rotate(${rotY}) scale(1)`}>
            {/* Projected Cube / Prism Edges */}
            {geoData.shapeType === 'cube' && (
              <>
                <polygon
                  points="-30,-30 30,-30 30,30 -30,30"
                  fill={isWireframe ? 'none' : '#10b98133'}
                  stroke="#10b981"
                  strokeWidth="2"
                />
                <polygon
                  points="-15,-45 45,-45 45,15 -15,15"
                  fill={isWireframe ? 'none' : '#10b98122'}
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray={isWireframe ? '2' : 'none'}
                />
                <line x1="-30" y1="-30" x2="-15" y2="-45" stroke="#10b981" strokeWidth="1.5" />
                <line x1="30" y1="-30" x2="45" y2="-45" stroke="#10b981" strokeWidth="1.5" />
                <line x1="30" y1="30" x2="45" y2="15" stroke="#10b981" strokeWidth="1.5" />
                <line x1="-30" y1="30" x2="-15" y2="15" stroke="#10b981" strokeWidth="1.5" />
              </>
            )}

            {/* Projected Sphere */}
            {geoData.shapeType === 'sphere' && (
              <>
                <circle cx="0" cy="0" r="35" fill={isWireframe ? 'none' : '#10b98133'} stroke="#10b981" strokeWidth="2" />
                <ellipse cx="0" cy="0" rx="35" ry="12" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="3" />
                <ellipse cx="0" cy="0" rx="12" ry="35" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="3" />
              </>
            )}

            {/* Projected Cylinder / Cone / Pyramid Fallback */}
            {geoData.shapeType !== 'cube' && geoData.shapeType !== 'sphere' && (
              <>
                <polygon points="0,-40 -35,30 35,30" fill={isWireframe ? 'none' : '#10b98133'} stroke="#10b981" strokeWidth="2" />
                <ellipse cx="0" cy="30" rx="35" ry="10" fill="none" stroke="#10b981" strokeWidth="1.5" />
              </>
            )}
          </g>
        </svg>
      </div>

      {/* Rotation Control Sliders */}
      <div className="grid grid-cols-2 gap-2 pt-2 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400 font-bold">Rot Y:</span>
          <input
            type="range"
            min="0"
            max="360"
            value={rotY}
            onChange={(e) => setRotY(Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-1.5 justify-end text-zinc-300">
          <span>Faces: <strong className="text-emerald-400">{geoData.facesCount}</strong></span>
          <span>Edges: <strong className="text-cyan-300">{geoData.edgesCount}</strong></span>
        </div>
      </div>
    </div>
  );
};
