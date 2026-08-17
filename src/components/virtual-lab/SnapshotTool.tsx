import React, { useState } from 'react';
import { Camera, Check, Download } from 'lucide-react';
import { labSound } from '../../labs/utils/LabSoundManager';

interface SnapshotToolProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  experimentId?: string;
  onSaveToNotebook?: (dataUrl: string) => void;
  className?: string;
}

export const SnapshotTool: React.FC<SnapshotToolProps> = ({
  containerRef,
  experimentId = 'virtual_lab',
  onSaveToNotebook,
  className = '',
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleTakeSnapshot = async () => {
    if (!containerRef.current || isCapturing) return;
    setIsCapturing(true);

    try {
      const container = containerRef.current;
      const width = container.clientWidth || 1280;
      const height = container.clientHeight || 720;

      // Offscreen composite canvas
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = width * window.devicePixelRatio;
      compositeCanvas.height = height * window.devicePixelRatio;
      const ctx = compositeCanvas.getContext('2d');

      if (!ctx) throw new Error('Could not get composite canvas context');

      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // 1. Dark lab background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      // 2. Find all inner canvas elements (experiment canvas + annotation canvas)
      const canvases = container.querySelectorAll('canvas');
      canvases.forEach((c) => {
        try {
          ctx.drawImage(c, 0, 0, width, height);
        } catch (e) {
          console.warn('Could not composite canvas:', e);
        }
      });

      // 3. Export to PNG
      const dataUrl = compositeCanvas.toDataURL('image/png');

      // Save to Notebook if supported
      if (onSaveToNotebook) {
        onSaveToNotebook(dataUrl);
      }

      // Download file
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `HoloLearn_${experimentId}_${Date.now()}.png`;
      link.click();

      labSound.playProcedureCompleted();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error('Snapshot capture failed:', err);
      labSound.playInvalidInput();
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleTakeSnapshot}
      disabled={isCapturing}
      aria-label="Save Experiment Snapshot"
      title="Save Snapshot (Experiment + Annotations)"
      className={`p-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 font-mono text-xs ${
        savedSuccess
          ? 'bg-emerald-500 text-black font-bold'
          : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-white/10 hover:border-white/20'
      } ${className}`}
    >
      {savedSuccess ? (
        <>
          <Check className="w-4 h-4 text-black" />
          <span className="hidden sm:inline">Saved!</span>
        </>
      ) : (
        <>
          <Camera className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Snapshot</span>
        </>
      )}
    </button>
  );
};
