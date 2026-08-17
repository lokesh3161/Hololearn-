import React, { useState } from 'react';
import { X, Copy, Check, QrCode, Users, Wifi } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';

export const ShareModal: React.FC = () => {
  const { isShareModalOpen, setShareModalOpen, lessonTitle } = useBoardStore();
  const [copied, setCopied] = useState(false);

  if (!isShareModalOpen) return null;

  const roomCode = 'HOLO-8942-AI';
  const joinUrl = `https://hololearn.ai/join?room=${roomCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md pointer-events-auto">
      <div className="w-full max-w-md bg-[#0d0d0d] border border-white/15 rounded-2xl shadow-2xl p-6 text-white glass-panel-elevated space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-white" />
            <h3 className="font-semibold text-sm tracking-wide">Share Classroom Smartboard</h3>
          </div>
          <button
            onClick={() => setShareModalOpen(false)}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-zinc-300">
          Lesson: <span className="text-white font-semibold">{lessonTitle}</span>
        </div>

        {/* Room Code */}
        <div className="p-4 bg-zinc-900 rounded-xl border border-white/10 text-center space-y-1">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
            Classroom Room Code
          </div>
          <div className="text-2xl font-mono font-bold tracking-wider text-white">
            {roomCode}
          </div>
          <div className="flex items-center justify-center gap-1 text-[11px] text-zinc-400">
            <Wifi className="w-3 h-3 text-white animate-pulse" />
            <span>Broadcast Syncing Active · 0 Students Connected</span>
          </div>
        </div>

        {/* Link Copy */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-zinc-400">Student Invite Link:</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={joinUrl}
              className="flex-1 bg-zinc-900 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Simulated QR Code SVG */}
        <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/10 gap-2">
          <QrCode className="w-20 h-20 text-white" />
          <span className="text-[10px] font-mono text-zinc-400">Scan QR Code on Tablet / Stylus to Join</span>
        </div>
      </div>
    </div>
  );
};
