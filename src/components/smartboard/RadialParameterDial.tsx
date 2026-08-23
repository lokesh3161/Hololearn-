import React, { useState, useRef, useEffect, useCallback } from 'react';

interface RadialDialProps {
  x: number;
  y: number;
  radius?: number;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  variableName: string;
  unit?: string;
  onChange: (val: number) => void;
}

export const RadialParameterDial: React.FC<RadialDialProps> = ({
  x,
  y,
  radius = 42,
  min = -10,
  max = 10,
  step = 0.5,
  value,
  variableName,
  unit = '',
  onChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dialRef = useRef<SVGSVGElement | null>(null);

  // Normalize current value to angle (0 to 360 deg)
  const angle = ((value - min) / Math.max(0.001, max - min)) * 360;
  const rad = ((angle - 90) * Math.PI) / 180;

  const calculateAngleValue = useCallback(
    (clientX: number, clientY: number) => {
      if (!dialRef.current) return;
      const rect = dialRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let deg = (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI + 90;
      if (deg < 0) deg += 360;

      let computedVal = min + (deg / 360) * (max - min);
      computedVal = Math.round(computedVal / step) * step;
      computedVal = Math.max(min, Math.min(max, computedVal));
      onChange(Number(computedVal.toFixed(1)));
    },
    [min, max, step, onChange]
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      calculateAngleValue(e.clientX, e.clientY);
    };

    const handlePointerUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, calculateAngleValue]);

  return (
    <svg
      ref={dialRef}
      style={{
        position: 'absolute',
        left: x - radius - 20,
        top: y - radius - 20,
        width: (radius + 20) * 2,
        height: (radius + 20) * 2,
        overflow: 'visible',
        pointerEvents: 'auto',
        zIndex: 50,
      }}
    >
      {/* Track Ring */}
      <circle
        cx={radius + 20}
        cy={radius + 20}
        r={radius}
        fill="rgba(15, 23, 42, 0.75)"
        stroke="#334155"
        strokeWidth="3"
        strokeDasharray="4 4"
      />

      {/* Active Value Arc */}
      <circle
        cx={radius + 20}
        cy={radius + 20}
        r={radius}
        fill="none"
        stroke="#38BDF8"
        strokeWidth="4"
        strokeDasharray={`${(angle / 360) * (2 * Math.PI * radius)} 1000`}
        strokeLinecap="round"
        transform={`rotate(-90 ${radius + 20} ${radius + 20})`}
      />

      {/* Interactive Drag Knob */}
      <circle
        cx={radius + 20 + radius * Math.cos(rad)}
        cy={radius + 20 + radius * Math.sin(rad)}
        r="9"
        fill="#38BDF8"
        stroke="#FFFFFF"
        strokeWidth="2"
        style={{ cursor: 'grab', filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.8))' }}
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsDragging(true);
        }}
      />

      {/* Value Label */}
      <text
        x={radius + 20}
        y={radius + 25}
        textAnchor="middle"
        fill="#F8FAFC"
        fontSize="12px"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="600"
        pointerEvents="none"
      >
        {variableName}={value.toFixed(1)}{unit}
      </text>
    </svg>
  );
};
