import React, { useState } from 'react';
import { RadialParameterDial } from './RadialParameterDial';

interface GraphObjectProps {
  id: string;
  initialX: number;
  initialY: number;
  equation?: string;
  expression?: string;
  x?: number;
  y?: number;
  onDelete?: () => void;
}

export const FramelessGraphObject: React.FC<GraphObjectProps> = ({
  id,
  initialX,
  initialY,
  x,
  y,
}) => {
  const [paramC, setParamC] = useState<number>(-3);
  const [paramA, setParamA] = useState<number>(0.5);

  const posX = x ?? initialX;
  const posY = y ?? initialY;

  const width = 360;
  const height = 240;
  const originX = width / 2;
  const originY = height / 2;
  const scale = 20;

  const points: string[] = [];
  for (let px = -originX; px <= originX; px += 2) {
    const xVal = px / scale;
    const yVal = paramA * Math.pow(xVal, 2) + paramC;
    const py = originY - yVal * scale;
    points.push(`${px + originX},${py}`);
  }
  const pathD = `M ${points.join(' L ')}`;

  return (
    <div
      style={{
        position: 'absolute',
        left: posX,
        top: posY,
        width,
        height,
        pointerEvents: 'none',
      }}
    >
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <line x1={0} y1={originY} x2={width} y2={originY} stroke="#334155" strokeWidth="1.5" />
        <line x1={originX} y1={0} x2={originX} y2={height} stroke="#334155" strokeWidth="1.5" />

        <path
          d={pathD}
          fill="none"
          stroke="#38BDF8"
          strokeWidth="3"
          style={{ filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.4))' }}
        />

        <circle
          cx={originX}
          cy={originY - paramC * scale}
          r="5"
          fill="#F59E0B"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
      </svg>

      <RadialParameterDial
        x={width + 50}
        y={originY}
        value={paramC}
        variableName="c"
        min={-8}
        max={8}
        step={0.5}
        onChange={(val) => setParamC(val)}
      />
    </div>
  );
};
