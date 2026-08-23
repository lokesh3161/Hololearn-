import React, { useState } from 'react';
import { SmartboardCanvas } from '../canvas/SmartboardCanvas';
import { FloatingTopbar } from './FloatingTopbar';
import { FloatingToolbar } from './FloatingToolbar';
import { EphemeralAIPopover } from './EphemeralAIPopover';
import { ContextualSuggestionPill } from './ContextualSuggestionPill';
import { ShapeActionPill } from './ShapeActionPill';
import { SearchableLectureTimeline } from './SearchableLectureTimeline';
import { FramelessGraphObject } from './FramelessGraphObject';
import { Frameless3DObject } from './Frameless3DObject';
import { useBoardStore } from '../../store/boardStore';

export const SmartBoardShell: React.FC = () => {
  const [isAIPopoverOpen, setIsAIPopoverOpen] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const { objects, deleteSelectedObjects } = useBoardStore();

  return (
    <div className="relative w-screen h-screen bg-[#0D1117] overflow-hidden flex flex-col font-sans select-none">
      <div
        className="absolute inset-0 pointer-events-none opacity-30 z-0"
        style={{
          backgroundImage: 'radial-gradient(#1E293B 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <FloatingTopbar onOpenTimeline={() => setShowTimelineModal(true)} />

      <main className="relative flex-1 w-full h-full z-10">
        <SmartboardCanvas />

        {objects
          .filter((o) => o.type === 'equation' && o.mathLatex)
          .map((eq) => (
            <FramelessGraphObject
              key={eq.id}
              id={eq.id}
              initialX={eq.x + 200}
              initialY={eq.y + 50}
              expression={eq.mathLatex!}
              x={eq.x + 200}
              y={eq.y + 50}
              onDelete={() => deleteSelectedObjects()}
            />
          ))}

        {objects
          .filter((o) => o.type === 'shape' && ['cube', 'sphere', 'cylinder', 'cone', 'prism'].includes(o.shapeSubtype || ''))
          .slice(0, 2)
          .map((shape) => (
            <Frameless3DObject
              key={shape.id}
              id={shape.id}
              shapeType={shape.shapeSubtype || 'cube'}
              x={shape.x + 220}
              y={shape.y + 40}
              onDelete={() => deleteSelectedObjects()}
            />
          ))}

        <ContextualSuggestionPill />
        <ShapeActionPill />
      </main>

      <FloatingToolbar
        onToggleAIPopover={() => setIsAIPopoverOpen(!isAIPopoverOpen)}
        isAIPopoverOpen={isAIPopoverOpen}
      />

      <EphemeralAIPopover isOpen={isAIPopoverOpen} onClose={() => setIsAIPopoverOpen(false)} />

      {showTimelineModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            <SearchableLectureTimeline onClose={() => setShowTimelineModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};
