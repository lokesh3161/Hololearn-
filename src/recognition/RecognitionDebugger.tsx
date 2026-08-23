import React from 'react';
import type { RecognitionResult } from './types';
import { X, CheckCircle2, AlertTriangle, ShieldX, Info } from 'lucide-react';

interface RecognitionDebuggerProps {
  result: RecognitionResult | null;
  onClose: () => void;
}

export const RecognitionDebugger: React.FC<RecognitionDebuggerProps> = ({ result, onClose }) => {
  if (!result) return null;

  const { status, bestCandidate, secondBestCandidate, candidates, confidenceMargin, features, reason } = result;

  const statusColor =
    status === 'recognized'
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40'
      : status === 'uncertain'
      ? 'text-amber-400 border-amber-500/40 bg-amber-950/40'
      : 'text-red-400 border-red-500/40 bg-red-950/40';

  const statusIcon =
    status === 'recognized' ? (
      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    ) : status === 'uncertain' ? (
      <AlertTriangle className="w-4 h-4 text-amber-400" />
    ) : (
      <ShieldX className="w-4 h-4 text-red-400" />
    );

  return (
    <div className="fixed top-16 right-4 z-50 w-80 bg-zinc-950/95 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl p-4 font-mono text-xs text-white select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/15">
        <div className="flex items-center gap-2 font-bold tracking-wider uppercase text-[11px] text-white">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>Recognition Debugger</span>
        </div>
        <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/10">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Status Pill */}
      <div className={`p-2.5 rounded-lg border flex items-center justify-between mb-3 ${statusColor}`}>
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className="font-bold uppercase text-[11px]">{status}</span>
        </div>
        {bestCandidate && (
          <span className="font-bold text-white uppercase bg-white/10 px-2 py-0.5 rounded text-[11px]">
            {bestCandidate.type} ({Math.round(bestCandidate.confidence * 100)}%)
          </span>
        )}
      </div>

      {/* Reason Description */}
      {reason && (
        <div className="text-[10px] text-zinc-400 bg-zinc-900/80 p-2 rounded border border-white/5 mb-3 leading-relaxed">
          {reason}
        </div>
      )}

      {/* Confidence Margin */}
      <div className="flex items-center justify-between bg-zinc-900 p-2 rounded border border-white/10 mb-3 text-[11px]">
        <span className="text-zinc-400">Confidence Margin:</span>
        <span className="font-bold text-cyan-300">+{Math.round(confidenceMargin * 100)}%</span>
      </div>

      {/* Candidates List */}
      <div className="mb-3 space-y-1.5">
        <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wide">Candidates Ranked:</div>
        {candidates.length === 0 ? (
          <div className="text-[10px] text-zinc-500 italic py-1">No candidate matches</div>
        ) : (
          candidates.slice(0, 5).map((cand, idx) => (
            <div key={cand.type} className="space-y-1 bg-zinc-900/60 p-1.5 rounded border border-white/5">
              <div className="flex items-center justify-between text-[11px]">
                <span className={`capitalize ${idx === 0 ? 'text-white font-bold' : 'text-zinc-400'}`}>
                  {idx + 1}. {cand.type}
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {Math.round(cand.confidence * 100)}%
                </span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    idx === 0 ? 'bg-emerald-400' : idx === 1 ? 'bg-cyan-400' : 'bg-zinc-500'
                  }`}
                  style={{ width: `${Math.round(cand.confidence * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Extracted Features */}
      {features && (
        <div className="space-y-1 border-t border-white/10 pt-2 text-[10px] text-zinc-300">
          <div className="text-zinc-400 uppercase font-bold text-[9px]">Extracted Features:</div>
          <div className="grid grid-cols-2 gap-1.5 bg-zinc-900 p-2 rounded border border-white/5">
            <div>Closed: <span className="text-white font-bold">{features.isClosed ? 'YES' : 'NO'}</span></div>
            <div>Corners: <span className="text-white font-bold">{features.cornerCount}</span></div>
            <div>Straightness: <span className="text-white font-bold">{Math.round(features.straightness * 100)}%</span></div>
            <div>Circularity: <span className="text-white font-bold">{Math.round(features.circularity * 100)}%</span></div>
            <div>Aspect Ratio: <span className="text-white font-bold">{features.aspectRatio.toFixed(2)}</span></div>
            <div>Radial Error: <span className="text-white font-bold">{features.radialError.toFixed(2)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};
