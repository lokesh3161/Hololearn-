import React, { useRef, useEffect, useState } from 'react';
import { resizeCanvasToDisplaySize } from './canvasHelper';
import { geometry3DEngine, type Vector3D } from '../../engines/Geometry3DEngine';
import { RotateCcw, Box, Eye } from 'lucide-react';

export const Geometry3DSim: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [shapeType, setShapeType] = useState<'sphere' | 'cylinder' | 'cone'>('sphere');
  const [radius, setRadius] = useState<number>(60);
  const [height, setHeight] = useState<number>(100);
  const [rotX, setRotX] = useState<number>(20);
  const [rotY, setRotY] = useState<number>(35);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => {
      resizeCanvasToDisplaySize(canvas);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const heightCanvas = canvas.height;

      ctx.clearRect(0, 0, width, heightCanvas);

      // Background grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, heightCanvas);
        ctx.stroke();
      }
      for (let y = 0; y < heightCanvas; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Generate 3D Mesh
      const mesh =
        shapeType === 'sphere'
          ? geometry3DEngine.createSphereMesh(radius)
          : shapeType === 'cylinder'
          ? geometry3DEngine.createCylinderMesh(radius, height)
          : geometry3DEngine.createConeMesh(radius, height);

      // Rotate and Project Vertices
      const projected = mesh.vertices.map((v) => {
        const rot = geometry3DEngine.rotatePoint(v, rotX, rotY);
        return geometry3DEngine.project3D(rot, width, heightCanvas, 320, 450);
      });

      // Render 3D Wireframe Faces
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';

      for (const face of mesh.faces) {
        ctx.beginPath();
        const start = projected[face[0]];
        if (!start) continue;
        ctx.moveTo(start.x, start.y);

        for (let i = 1; i < face.length; i++) {
          const pt = projected[face[i]];
          if (pt) ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Render Coordinate Axes (X=Red, Y=Green, Z=Blue)
      const axisLen = 120;
      const axes = [
        { pt: { x: axisLen, y: 0, z: 0 }, color: '#FF0055', label: 'X' },
        { pt: { x: 0, y: axisLen, z: 0 }, color: '#00FF88', label: 'Y' },
        { pt: { x: 0, y: 0, z: axisLen }, color: '#0099FF', label: 'Z' },
      ];

      const origin = geometry3DEngine.project3D(geometry3DEngine.rotatePoint({ x: 0, y: 0, z: 0 }, rotX, rotY), width, heightCanvas, 320, 450);

      for (const ax of axes) {
        const rot = geometry3DEngine.rotatePoint(ax.pt, rotX, rotY);
        const proj = geometry3DEngine.project3D(rot, width, heightCanvas, 320, 450);

        ctx.strokeStyle = ax.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(proj.x, proj.y);
        ctx.stroke();

        ctx.fillStyle = ax.color;
        ctx.font = 'bold 12px monospace';
        ctx.fillText(ax.label, proj.x + 5, proj.y + 5);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [shapeType, radius, height, rotX, rotY]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setRotY((prev) => prev + dx * 0.5);
    setRotX((prev) => prev - dy * 0.5);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(false);
  };

  const vol =
    shapeType === 'sphere'
      ? geometry3DEngine.sphereVolume(radius)
      : shapeType === 'cylinder'
      ? geometry3DEngine.cylinderVolume(radius, height)
      : geometry3DEngine.coneVolume(radius, height);

  const area =
    shapeType === 'sphere'
      ? geometry3DEngine.sphereSurfaceArea(radius)
      : 2 * Math.PI * radius * (radius + height);

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-[#0a0a0a] text-white select-none">
      {/* 3D Viewport */}
      <div
        className="flex-1 relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
        <div className="absolute top-4 left-4 bg-black/70 backdrop-blur border border-white/10 p-3 rounded-xl font-mono text-xs space-y-1">
          <div className="text-zinc-400 uppercase text-[10px] flex items-center gap-1">
            <Eye className="w-3 h-3 text-white" /> Drag mouse to rotate 3D view
          </div>
          <div>Rotation X: {Math.round(rotX)}° | Y: {Math.round(rotY)}°</div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-full md:w-80 bg-zinc-950 border-l border-white/10 p-5 space-y-5 font-mono text-xs">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-white/10 pb-2">
          <Box className="w-4 h-4 text-white" /> 3D Geometry Engine
        </h3>

        <div className="space-y-2">
          <label className="text-zinc-400 text-[10px] uppercase">Select 3D Shape</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['sphere', 'cylinder', 'cone'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setShapeType(s)}
                className={`py-1.5 rounded-lg border uppercase text-[11px] transition-all ${
                  shapeType === s ? 'bg-white text-black font-bold' : 'border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Radius (r):</span>
              <span className="text-white font-bold">{radius} px</span>
            </div>
            <input
              type="range"
              min="20"
              max="120"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-white bg-zinc-800"
            />
          </div>

          {shapeType !== 'sphere' && (
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Height (h):</span>
                <span className="text-white font-bold">{height} px</span>
              </div>
              <input
                type="range"
                min="40"
                max="180"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full accent-white bg-zinc-800"
              />
            </div>
          )}
        </div>

        {/* Live Mathematical Formula & Value Substitution */}
        <div className="bg-zinc-900 border border-white/15 p-4 rounded-xl space-y-2">
          <div className="text-[10px] text-zinc-400 uppercase">Live Substituted Calculations:</div>
          <div className="text-white text-xs space-y-1">
            {shapeType === 'sphere' && (
              <>
                <div>\(V = \frac{4}{3}\pi r^3 = \frac{4}{3}\pi({radius})^3\)</div>
                <div className="text-emerald-400 font-bold">V ≈ {Math.round(vol).toLocaleString()} px³</div>
                <div className="pt-1">\(A = 4\pi r^2 = 4\pi({radius})^2\)</div>
                <div className="text-emerald-400 font-bold">A ≈ {Math.round(area).toLocaleString()} px²</div>
              </>
            )}
            {shapeType === 'cylinder' && (
              <>
                <div>\(V = \pi r^2 h = \pi({radius})^2 \times {height}\)</div>
                <div className="text-emerald-400 font-bold">V ≈ {Math.round(vol).toLocaleString()} px³</div>
              </>
            )}
            {shapeType === 'cone' && (
              <>
                <div>\(V = \frac{1}{3}\pi r^2 h = \frac{1}{3}\pi({radius})^2 \times {height}\)</div>
                <div className="text-emerald-400 font-bold">V ≈ {Math.round(vol).toLocaleString()} px³</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
