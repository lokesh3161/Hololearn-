import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  ChevronRight,
  ChevronLeft,
  Play,
  CheckCircle2,
  BrainCircuit,
  GraduationCap,
} from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import { detectEquation, getEquationById } from '../../registry/equationRegistry';
import { scheduleDetection } from '../../services/detectionService';
import type { SimulationId } from '../../types/canvas';

export const AIPanel: React.FC = () => {
  const {
    aiPanelOpen,
    toggleAIPanel,
    activeTab,
    setActiveTab,
    aiMessages,
    addAIMessage,
    activeDetection,
    openSimulation,
    mode,
    activeSubject,
  } = useBoardStore();

  const [inputQuery, setInputQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  const matchedEq = activeDetection ? detectEquation(activeDetection.detectedName, activeSubject).entry : null;

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim()) return;

    addAIMessage({
      sender: 'teacher',
      text: inputQuery,
    });

    const query = inputQuery.toLowerCase();
    setInputQuery('');

    setTimeout(() => {
      const regRes = detectEquation(query);
      if (regRes.entry) {
        const entry = regRes.entry;
        addAIMessage({
          sender: 'ai',
          text: `**${entry.displayName}** (${entry.latex})\n\n${entry.explanation}\n\n💡 **JEE Tip:** ${
            entry.jeeRelevance || 'Master variable dependencies and vector directions.'
          }`,
          actions: entry.simulationType
            ? [
                {
                  label: `Launch ${entry.displayName} Simulator`,
                  actionType: 'simulation',
                  payload: entry.simulationType,
                },
              ]
            : undefined,
        });
      } else if (query.includes('simulate') || query.includes('launch') || query.includes('demo')) {
        addAIMessage({
          sender: 'ai',
          text: `I've prepared the simulation for **Newton's Second Law ($F = ma$)**. You can adjust mass and acceleration parameters to see force vector scaling.`,
          actions: [
            { label: 'Launch F=ma Simulator', actionType: 'simulation', payload: 'newton' },
            { label: 'Launch Projectile Sim', actionType: 'simulation', payload: 'projectile' },
          ],
        });
      } else if (query.includes('quiz') || query.includes('question') || query.includes('practice')) {
        addAIMessage({
          sender: 'ai',
          text: `Here is a practice problem based on current smartboard context:\n\n**Q:** If a rocket engine generates a force of $F = 5000\\text{ N}$ on a mass of $m = 250\\text{ kg}$, what is its acceleration $a$?\n\nA) $10\\text{ m/s}^2$\nB) $20\\text{ m/s}^2$\nC) $25\\text{ m/s}^2$\nD) $50\\text{ m/s}^2$`,
          actions: [{ label: 'Verify Answer B (20 m/s²)', actionType: 'quiz' }],
        });
      } else {
        addAIMessage({
          sender: 'ai',
          text: `Understood. Analyzing smartboard registry for query context. How would you like to proceed with the class?`,
          actions: [
            { label: 'Launch F=ma Simulator', actionType: 'simulation', payload: 'newton' },
            { label: 'Generate Practice Quiz', actionType: 'quiz' },
          ],
        });
      }
    }, 500);
  };

  const handleVoiceToggle = () => {
    if (!isListening) {
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        setInputQuery('Explain Newton second law with interactive force vectors');
      }, 2500);
    } else {
      setIsListening(false);
    }
  };

  if (!aiPanelOpen) {
    return (
      <button
        onClick={toggleAIPanel}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-30 bg-[#111111] border-l border-t border-b border-white/15 p-2 rounded-l-xl text-white shadow-2xl hover:bg-white/10 transition-colors"
        title="Open AI Panel"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
    );
  }

  const handleAnalyzeBoard = () => {
    const textObjs = useBoardStore.getState().objects;
    if (!textObjs || textObjs.length === 0) {
      addAIMessage({
        sender: 'ai',
        text: 'No elements drawn on board yet. Type or write a formula on the smartboard to analyze.',
      });
      return;
    }
    const lastObj = textObjs[textObjs.length - 1];
    scheduleDetection(lastObj, (det) => {
      useBoardStore.getState().setActiveDetection(det);
    });
    addAIMessage({
      sender: 'ai',
      text: `Analyzed ${textObjs.length} elements on smartboard. Active detection updated.`,
    });
  };

  return (
    <aside className="w-80 bg-black border-l border-white/10 flex flex-col justify-between text-white select-none z-30 relative">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-950">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          <span className="font-semibold text-xs text-white tracking-wide">
            AI · HoloLearn
          </span>
        </div>
        <button
          onClick={toggleAIPanel}
          className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-white/10 bg-zinc-950 text-xs font-medium">
        {(['Assist', 'Explain', 'Simulate', 'Quiz'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-center transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-white text-white font-semibold bg-white/5'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Canvas Context Card */}
      <div className="p-3 bg-zinc-900/60 border-b border-white/10 text-xs space-y-1">
        <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1">
            <BrainCircuit className="w-3 h-3 text-white" />
            Detected STEM Context
          </span>
          {matchedEq && (
            <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white font-mono uppercase">
              {matchedEq.subject}
            </span>
          )}
        </div>
        <div className="font-semibold text-white text-xs truncate">
          {activeDetection ? activeDetection.detectedName : "F = ma · Newton's Second Law"}
        </div>
        {matchedEq?.jeeRelevance && (
          <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-1 pt-1">
            <GraduationCap className="w-3 h-3 text-white flex-shrink-0" />
            <span className="truncate">{matchedEq.jeeRelevance}</span>
          </div>
        )}
      </div>

      {/* Action Cards */}
      <div className="p-3 border-b border-white/10 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={handleAnalyzeBoard}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black font-semibold text-xs transition-all active:scale-95 shadow-md"
        >
          <Sparkles className="w-3 h-3 text-black" />
          <span>Analyze Board</span>
        </button>
        <button
          onClick={() => openSimulation(matchedEq?.simulationType || 'newton')}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-zinc-200 hover:text-white transition-all active:scale-95"
        >
          <Play className="w-3 h-3 text-white" />
          <span>Launch Simulator</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('Quiz');
            addAIMessage({
              sender: 'ai',
              text: `Generated 3 practice questions for **${matchedEq?.displayName || 'Classical Mechanics'}**.`,
            });
          }}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-zinc-200 hover:text-white transition-all active:scale-95"
        >
          <CheckCircle2 className="w-3 h-3 text-white" />
          <span>Practice Quiz</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
        {aiMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'teacher' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[90%] p-3 rounded-xl border ${
                msg.sender === 'teacher'
                  ? 'bg-white text-black font-medium border-white shadow-lg'
                  : 'bg-zinc-900 text-white border-white/10 shadow-md'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
            </div>

            {msg.actions && msg.actions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {msg.actions.map((act, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (act.actionType === 'simulation' && act.payload) {
                        openSimulation(act.payload as SimulationId);
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-medium text-white transition-all active:scale-95"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{act.label}</span>
                  </button>
                ))}
              </div>
            )}
            <span className="text-[10px] font-mono text-zinc-500 mt-1">{msg.timestamp}</span>
          </div>
        ))}
      </div>

      {/* Voice Banner */}
      {isListening && (
        <div className="p-2 bg-white/10 border-t border-white/10 flex items-center justify-center gap-2 text-xs font-mono text-white animate-pulse">
          <span className="w-2 h-2 rounded-full bg-white" />
          <span>Listening to teacher speech...</span>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-zinc-950 flex items-center gap-2">
        <button
          type="button"
          onClick={handleVoiceToggle}
          className={`p-2 rounded-lg transition-colors ${
            isListening
              ? 'bg-white text-black font-bold animate-pulse'
              : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
          title="Voice Speech Input"
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={mode === 'teacher' ? 'Ask AI tutor or command board...' : 'Ask question to AI tutor...'}
          className="flex-1 bg-zinc-900 border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white font-medium"
        />

        <button
          type="submit"
          className="p-2 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 transition-colors active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </aside>
  );
};
