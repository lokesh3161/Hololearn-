import { create } from 'zustand';

export interface TranscriptSegment {
  id: string;
  timestamp: string; // e.g. "05:20"
  seconds: number;
  speaker: 'Teacher' | 'Student' | 'AI';
  text: string;
  topicMarker?: string;
  associatedBoardObjectId?: string;
}

export interface LessonTopicMarker {
  id: string;
  timestamp: string; // e.g. "00:00"
  seconds: number;
  title: string;
  description: string;
}

export interface StudentPollItem {
  id: string;
  question: string;
  options: string[];
  votes: number[];
  isActive: boolean;
}

export interface StudentQuestionItem {
  id: string;
  studentName: string;
  questionText: string;
  timestamp: string;
  isAnswered: boolean;
}

interface ClassroomState {
  // Lesson Info
  currentSubject: string; // 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology'
  currentTopic: string;
  isRecording: boolean;
  recordingStartTime: number | null;

  // Lecture Transcript & Timeline
  transcripts: TranscriptSegment[];
  lessonTimeline: LessonTopicMarker[];
  
  // Student Interaction Layer
  studentPolls: StudentPollItem[];
  studentQuestions: StudentQuestionItem[];
  activePollId: string | null;

  // Actions
  setCurrentSubject: (subject: string) => void;
  setCurrentTopic: (topic: string) => void;
  toggleRecording: () => void;

  addTranscriptSegment: (text: string, speaker?: 'Teacher' | 'Student' | 'AI', topicMarker?: string, objectId?: string) => void;
  addTopicMarker: (title: string, description?: string) => void;
  
  createStudentPoll: (question: string, options: string[]) => void;
  voteStudentPoll: (pollId: string, optionIndex: number) => void;
  closeStudentPoll: (pollId: string) => void;
  
  addStudentQuestion: (studentName: string, questionText: string) => void;
  markQuestionAnswered: (questionId: string) => void;

  clearClassroomSession: () => void;
}

export const useClassroomStore = create<ClassroomState>((set, get) => ({
  currentSubject: 'Physics',
  currentTopic: "Newton's Second Law of Motion",
  isRecording: false,
  recordingStartTime: null,

  transcripts: [
    { id: 'ts-1', timestamp: '00:00', seconds: 0, speaker: 'Teacher', text: 'Good morning class! Today we are studying Newton\'s Second Law of Motion.', topicMarker: 'Introduction' },
    { id: 'ts-2', timestamp: '02:15', seconds: 135, speaker: 'Teacher', text: 'Recall that acceleration is directly proportional to net force and inversely proportional to mass.', topicMarker: 'Force & Acceleration' },
    { id: 'ts-3', timestamp: '05:30', seconds: 330, speaker: 'Teacher', text: 'Mathematically, we express this as F = ma.', topicMarker: 'Equation F = ma' },
  ],

  lessonTimeline: [
    { id: 'lm-1', timestamp: '00:00', seconds: 0, title: 'Introduction', description: 'Overview of classical mechanics' },
    { id: 'lm-2', timestamp: '02:15', seconds: 135, title: 'Force & Acceleration', description: 'Proportional relationship between force and acceleration' },
    { id: 'lm-3', timestamp: '05:30', seconds: 330, title: 'Equation F = ma', description: 'Mathematical formulation of Newton\'s Second Law' },
  ],

  studentPolls: [
    {
      id: 'poll-1',
      question: 'If force F is doubled and mass m is kept constant, what happens to acceleration a?',
      options: ['Doubles', 'Halves', 'Stays same', 'Quadruples'],
      votes: [18, 2, 1, 0],
      isActive: true,
    },
  ],

  studentQuestions: [
    { id: 'sq-1', studentName: 'Ananya R.', questionText: 'Does F = ma apply when friction is present?', timestamp: '06:10', isAnswered: false },
    { id: 'sq-2', studentName: 'Rahul K.', questionText: 'What are the SI units of Force?', timestamp: '04:20', isAnswered: true },
  ],

  activePollId: 'poll-1',

  setCurrentSubject: (currentSubject) => set({ currentSubject }),
  setCurrentTopic: (currentTopic) => set({ currentTopic }),

  toggleRecording: () => {
    const { isRecording } = get();
    if (!isRecording) {
      set({ isRecording: true, recordingStartTime: Date.now() });
    } else {
      set({ isRecording: false, recordingStartTime: null });
    }
  },

  addTranscriptSegment: (text, speaker = 'Teacher', topicMarker, objectId) => {
    const { recordingStartTime, transcripts } = get();
    const elapsedMs = recordingStartTime ? Date.now() - recordingStartTime : transcripts.length * 15000;
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    const timestamp = `${mins}:${secs}`;

    const newSegment: TranscriptSegment = {
      id: `ts-${Date.now()}`,
      timestamp,
      seconds: totalSeconds,
      speaker,
      text,
      topicMarker,
      associatedBoardObjectId: objectId,
    };

    set((state) => ({ transcripts: [...state.transcripts, newSegment] }));
  },

  addTopicMarker: (title, description = '') => {
    const { transcripts } = get();
    const latest = transcripts[transcripts.length - 1];
    const timestamp = latest ? latest.timestamp : '00:00';
    const seconds = latest ? latest.seconds : 0;

    const newMarker: LessonTopicMarker = {
      id: `lm-${Date.now()}`,
      timestamp,
      seconds,
      title,
      description,
    };

    set((state) => ({ lessonTimeline: [...state.lessonTimeline, newMarker] }));
  },

  createStudentPoll: (question, options) => {
    const newPoll: StudentPollItem = {
      id: `poll-${Date.now()}`,
      question,
      options,
      votes: options.map(() => 0),
      isActive: true,
    };
    set((state) => ({
      studentPolls: [...state.studentPolls, newPoll],
      activePollId: newPoll.id,
    }));
  },

  voteStudentPoll: (pollId, optionIndex) => {
    set((state) => ({
      studentPolls: state.studentPolls.map((p) => {
        if (p.id !== pollId) return p;
        const nextVotes = [...p.votes];
        nextVotes[optionIndex] = (nextVotes[optionIndex] || 0) + 1;
        return { ...p, votes: nextVotes };
      }),
    }));
  },

  closeStudentPoll: (pollId) => {
    set((state) => ({
      studentPolls: state.studentPolls.map((p) => (p.id === pollId ? { ...p, isActive: false } : p)),
      activePollId: state.activePollId === pollId ? null : state.activePollId,
    }));
  },

  addStudentQuestion: (studentName, questionText) => {
    const { transcripts } = get();
    const latest = transcripts[transcripts.length - 1];
    const timestamp = latest ? latest.timestamp : '00:00';

    const newQ: StudentQuestionItem = {
      id: `sq-${Date.now()}`,
      studentName,
      questionText,
      timestamp,
      isAnswered: false,
    };

    set((state) => ({ studentQuestions: [...state.studentQuestions, newQ] }));
  },

  markQuestionAnswered: (questionId) => {
    set((state) => ({
      studentQuestions: state.studentQuestions.map((q) => (q.id === questionId ? { ...q, isAnswered: true } : q)),
    }));
  },

  clearClassroomSession: () => {
    set({
      transcripts: [],
      lessonTimeline: [],
      studentPolls: [],
      studentQuestions: [],
      activePollId: null,
      isRecording: false,
      recordingStartTime: null,
    });
  },
}));
