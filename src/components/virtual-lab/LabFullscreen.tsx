import React, { useState, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { labSound } from '../../labs/utils/LabSoundManager';

interface LabFullscreenProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export const LabFullscreen: React.FC<LabFullscreenProps> = ({ containerRef, className = '' }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const checkFullscreenStatus = useCallback(() => {
    const isFull = Boolean(
      document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
    );
    setIsFullscreen(isFull);
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', checkFullscreenStatus);
    document.addEventListener('webkitfullscreenchange', checkFullscreenStatus);
    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreenStatus);
      document.removeEventListener('webkitfullscreenchange', checkFullscreenStatus);
    };
  }, [checkFullscreenStatus]);

  const toggleFullscreen = useCallback(async () => {
    const target = containerRef.current || document.documentElement;

    try {
      if (!isFullscreen) {
        if (target.requestFullscreen) {
          await target.requestFullscreen();
        } else if ((target as any).webkitRequestFullscreen) {
          await (target as any).webkitRequestFullscreen();
        } else if ((target as any).msRequestFullscreen) {
          await (target as any).msRequestFullscreen();
        }
        labSound.playProcedureCompleted();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
        labSound.playPause();
      }
    } catch (err) {
      console.warn('Fullscreen toggle request failed:', err);
    }
  }, [isFullscreen, containerRef]);

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen (F)'}
      className={`p-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 font-mono text-xs ${
        isFullscreen
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
          : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-white/10 hover:border-white/20'
      } ${className}`}
    >
      {isFullscreen ? <Minimize2 className="w-4 h-4 text-emerald-400" /> : <Maximize2 className="w-4 h-4" />}
      <span className="hidden sm:inline">{isFullscreen ? 'Exit Full' : 'Full Screen'}</span>
    </button>
  );
};
