import React from 'react';
import { motion } from 'framer-motion';

export interface PolymerSpecimenRendererProps {
  rotationX?: number;
  rotationY?: number;
  zoom?: number;
  phase?: 'liquid' | 'viscous-liquid' | 'gel' | 'cured-solid';
  colorHex?: string;
  showMolecularOverlay?: boolean;
  className?: string;
}

export const PolymerSpecimenRenderer: React.FC<PolymerSpecimenRendererProps> = ({
  rotationX = 15,
  rotationY = 25,
  zoom = 1.0,
  phase = 'cured-solid',
  colorHex = '#9f1239',
  showMolecularOverlay = false,
  className = '',
}) => {
  // Specular light highlight position calculation based on rotation
  const highlightX = Math.max(10, Math.min(80, 30 + rotationY * 0.4));
  const highlightY = Math.max(10, Math.min(80, 25 - rotationX * 0.4));

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* 1. Lab Floor Contact Shadow */}
      <div
        className="absolute bottom-1 w-48 h-8 rounded-full bg-black/80 blur-md transition-all duration-300 pointer-events-none"
        style={{
          transform: `scale(${zoom * (1 + Math.abs(rotationX) * 0.005)}) translateY(${rotationX * 0.3}px)`,
          opacity: phase === 'cured-solid' ? 0.75 : 0.4,
        }}
      />

      {/* 2. 3D Perspective Specimen Container */}
      <div
        className="relative transition-transform duration-100 ease-out"
        style={{
          perspective: '800px',
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          style={{
            transform: `rotateY(${rotationY}deg) rotateX(${rotationX}deg) scale(${zoom})`,
            transformStyle: 'preserve-3d',
          }}
          className="relative w-56 h-48 flex items-center justify-center drop-shadow-2xl"
        >
          {/* Layer 1: Back Volume Shadow (Thickness Depth) */}
          <svg
            viewBox="0 0 260 210"
            className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
            style={{ transform: 'translateZ(-14px)' }}
          >
            <path
              d="M 50,15 C 90,5 150,10 190,25 C 235,45 245,100 230,145 C 210,185 160,195 100,190 C 45,185 10,150 15,100 C 20,50 30,20 50,15 Z"
              fill="#4c0519"
            />
          </svg>

          {/* Layer 2: Intermediate Extrusion Rim (Side Edge Thickness) */}
          <svg
            viewBox="0 0 260 210"
            className="absolute inset-0 w-full h-full pointer-events-none opacity-90"
            style={{ transform: 'translateZ(-7px)' }}
          >
            <path
              d="M 50,15 C 90,5 150,10 190,25 C 235,45 245,100 230,145 C 210,185 160,195 100,190 C 45,185 10,150 15,100 C 20,50 30,20 50,15 Z"
              fill="#881337"
              stroke="#f43f5e"
              strokeWidth="2"
            />
          </svg>

          {/* Layer 3: Main Organic Specimen Body */}
          <svg
            viewBox="0 0 260 210"
            className="w-full h-full filter drop-shadow-lg"
            style={{ transform: 'translateZ(0px)' }}
          >
            <defs>
              {/* Main Translucent Rose Gradient */}
              <radialGradient id="resinBodyGrad" cx={`${highlightX}%`} cy={`${highlightY}%`} r="75%">
                <stop offset="0%" stopColor="#fecdd3" stopOpacity="0.9" />
                <stop offset="35%" stopColor="#f43f5e" stopOpacity="0.85" />
                <stop offset="70%" stopColor={colorHex || '#be123c'} stopOpacity="0.95" />
                <stop offset="100%" stopColor="#4c0519" stopOpacity="0.98" />
              </radialGradient>

              {/* Internal Marbling Cloud Gradient */}
              <radialGradient id="cloudGrad" cx="45%" cy="50%" r="40%">
                <stop offset="0%" stopColor="#fda4af" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#881337" stopOpacity="0" />
              </radialGradient>

              {/* Surface Bevel Rim Highlight */}
              <linearGradient id="rimGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#fda4af" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#4c0519" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Organic Specimen Molded Geometry */}
            <path
              d="M 50,15 C 90,5 150,10 190,25 C 235,45 245,100 230,145 C 210,185 160,195 100,190 C 45,185 10,150 15,100 C 20,50 30,20 50,15 Z"
              fill="url(#resinBodyGrad)"
              stroke="url(#rimGlow)"
              strokeWidth="3"
            />

            {/* Subtle Internal Marbling Texture */}
            <path
              d="M 70,35 C 110,25 140,40 170,55 C 200,85 190,130 160,150 C 120,165 75,145 60,110 C 50,85 55,50 70,35 Z"
              fill="url(#cloudGrad)"
              className="pointer-events-none"
            />

            {/* Deterministic Micro-Bubbles / Inclusions */}
            <g opacity="0.6" fill="#ffffff">
              <circle cx="85" cy="65" r="2.5" opacity="0.8" />
              <circle cx="140" cy="95" r="3.5" opacity="0.6" />
              <circle cx="165" cy="60" r="2" opacity="0.7" />
              <circle cx="110" cy="135" r="4" opacity="0.5" />
              <circle cx="75" cy="120" r="2" opacity="0.8" />
            </g>

            {/* Surface Specular Reflection Highlight */}
            <ellipse
              cx={`${highlightX * 2.2 + 20}`}
              cy={`${highlightY * 1.6 + 15}`}
              rx="28"
              ry="14"
              fill="#ffffff"
              opacity="0.35"
              transform={`rotate(-25 ${highlightX * 2.2 + 20} ${highlightY * 1.6 + 15})`}
            />

            {/* Optional Educational Molecular Network Schematic Overlay */}
            {showMolecularOverlay && (
              <g stroke="#67e8f9" strokeWidth="1.5" opacity="0.6" strokeDasharray="3 2">
                <line x1="70" y1="70" x2="120" y2="70" />
                <line x1="120" y1="70" x2="160" y2="100" />
                <line x1="120" y1="70" x2="120" y2="120" />
                <line x1="70" y1="70" x2="70" y2="120" />
                <line x1="70" y1="120" x2="120" y2="120" />
                <line x1="120" y1="120" x2="160" y2="140" />

                <circle cx="70" cy="70" r="4" fill="#06b6d4" />
                <circle cx="120" cy="70" r="4" fill="#06b6d4" />
                <circle cx="160" cy="100" r="4" fill="#06b6d4" />
                <circle cx="120" cy="120" r="4" fill="#06b6d4" />
                <circle cx="70" cy="120" r="4" fill="#06b6d4" />
                <circle cx="160" cy="140" r="4" fill="#06b6d4" />
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};
