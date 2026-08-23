import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X, Bot } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import { SparkTeacherAssistant } from '../../services/SparkTeacherAssistant';

interface EphemeralAIPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EphemeralAIPopover: React.FC<EphemeralAIPopoverProps> = ({ isOpen, onClose }) => {
  const { aiMessages, addAIMessage } = useBoardStore();
  const [inputQuery, setInputQuery] = useState('');

  if (!isOpen) return null;

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim()) return;

    addAIMessage({
      sender: 'teacher',
      text: inputQuery,
    });

    const query = inputQuery;
    setInputQuery('');

    setTimeout(() => {
      addAIMessage({
        sender: 'ai',
        text: `✨ [Spark AI]: Analyzed smartboard query "${query}". Active equations and shapes are updated.`,
      });
    }, 400);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-20 right-8 z-50 w-96 max-h-[32rem] bg-zinc-950/95 border border-cyan-500/40 rounded-3xl p-4 shadow-2xl flex flex-col font-mono text-xs text-white backdrop-blur-2xl pointer-events-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              <Bot className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-cyan-300">Spark AI Tutor</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Action Chips */}
        <div className="flex items-center gap-1.5 pb-3 border-b border-white/10 overflow-x-auto no-scrollbar text-[10px]">
          <button
            type="button"
            onClick={() => SparkTeacherAssistant.generateQuizMCQs()}
            className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold hover:bg-cyan-500/30 transition-all flex-shrink-0"
          >
            📝 5 MCQs
          </button>
          <button
            type="button"
            onClick={() => SparkTeacherAssistant.translateToTelugu()}
            className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold hover:bg-emerald-500/30 transition-all flex-shrink-0"
          >
            🌐 Telugu
          </button>
          <button
            type="button"
            onClick={() => SparkTeacherAssistant.summarizeLast10Minutes()}
            className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold hover:bg-amber-500/30 transition-all flex-shrink-0"
          >
            📋 Summary
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-2.5 py-2 max-h-64 pr-1">
          {aiMessages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2.5 rounded-2xl text-[11px] leading-relaxed border ${
                msg.sender === 'teacher'
                  ? 'bg-white text-black font-semibold border-white ml-6'
                  : 'bg-zinc-900/90 text-zinc-200 border-white/10 mr-6'
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {/* Query Input */}
        <form onSubmit={handleSend} className="mt-3 flex items-center gap-2 pt-2 border-t border-white/10">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask AI tutor or command board..."
            className="flex-1 bg-zinc-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="p-2 rounded-xl bg-cyan-400 text-black font-bold hover:bg-cyan-300 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
    </AnimatePresence>
  );
};
