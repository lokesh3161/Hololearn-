import React, { useState } from 'react';
import { useClassroomStore } from '../../store/classroomStore';
import { SparkTeacherAssistant } from '../../services/SparkTeacherAssistant';
import { Search, Clock, Play, FileText, ChevronRight, X } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';

interface SearchableLectureTimelineProps {
  onClose?: () => void;
}

export const SearchableLectureTimeline: React.FC<SearchableLectureTimelineProps> = ({ onClose }) => {
  const { lessonTimeline, transcripts, currentTopic } = useClassroomStore();
  const [searchQuery, setSearchQuery] = useState('');
  const { addAIMessage } = useBoardStore();

  const searchResults = searchQuery ? SparkTeacherAssistant.searchLectureTranscripts(searchQuery) : [];

  const handleJumpToTimestamp = (timestamp: string, text: string) => {
    addAIMessage({
      sender: 'ai',
      text: `⏱️ Jumped to lecture timestamp **[${timestamp}]**: "${text}"`,
    });
  };

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 font-mono text-xs text-white space-y-3 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-sm text-cyan-300">SEARCHABLE LECTURE TIMELINE</span>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search lecture (e.g. 'acceleration', 'F=ma')..."
          className="w-full bg-zinc-950 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
        />
      </div>

      {/* Search Results vs Lesson Timeline */}
      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
        {searchQuery ? (
          searchResults.length === 0 ? (
            <div className="text-zinc-500 text-center py-4">No matching lecture excerpts found.</div>
          ) : (
            searchResults.map((res) => (
              <div
                key={res.id}
                onClick={() => handleJumpToTimestamp(res.timestamp, res.text)}
                className="bg-zinc-950 p-2.5 rounded-xl border border-cyan-500/30 hover:border-cyan-400 cursor-pointer space-y-1 transition-all"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-cyan-300">[{res.timestamp}] {res.speaker}</span>
                  {res.topicMarker && <span className="text-[9px] bg-cyan-500/20 text-cyan-200 px-1.5 py-0.5 rounded">{res.topicMarker}</span>}
                </div>
                <div className="text-[11px] text-zinc-300">{res.text}</div>
              </div>
            ))
          )
        ) : (
          lessonTimeline.map((item) => (
            <div
              key={item.id}
              onClick={() => handleJumpToTimestamp(item.timestamp, item.title)}
              className="bg-zinc-950 p-2.5 rounded-xl border border-white/10 hover:border-white/30 cursor-pointer flex items-center justify-between transition-all"
            >
              <div className="space-y-0.5">
                <div className="font-bold text-white text-[11px] flex items-center gap-1.5">
                  <span className="text-cyan-400 font-bold">[{item.timestamp}]</span>
                  <span>{item.title}</span>
                </div>
                <div className="text-[10px] text-zinc-400">{item.description}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
