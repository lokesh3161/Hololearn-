import { useBoardStore } from '../store/boardStore';
import { useClassroomStore } from '../store/classroomStore';
import type { CanvasObject } from '../types/canvas';

export interface ClassroomContextSnapshot {
  subject: string;
  topic: string;
  totalBoardObjects: number;
  equationsOnBoard: string[];
  shapesOnBoard: string[];
  recentSpeechTranscripts: string[];
  unansweredStudentQuestions: string[];
  lessonTimelineCount: number;
  activePollQuestion?: string;
  timestamp: string;
}

export class ClassroomContextEngine {
  /**
   * Capture a unified snapshot of the entire classroom environment state
   */
  static getSnapshot(): ClassroomContextSnapshot {
    const board = useBoardStore.getState();
    const classroom = useClassroomStore.getState();

    const equationsOnBoard = board.objects
      .filter((o) => o.type === 'equation' && o.mathLatex)
      .map((o) => o.mathLatex!);

    const shapesOnBoard = board.objects
      .filter((o) => o.type === 'shape' && o.shapeSubtype)
      .map((o) => o.shapeSubtype!);

    const recentSpeechTranscripts = classroom.transcripts
      .slice(-5)
      .map((t) => `${t.speaker} (${t.timestamp}): ${t.text}`);

    const unansweredStudentQuestions = classroom.studentQuestions
      .filter((q) => !q.isAnswered)
      .map((q) => `${q.studentName}: ${q.questionText}`);

    const activePoll = classroom.studentPolls.find((p) => p.id === classroom.activePollId && p.isActive);

    return {
      subject: classroom.currentSubject,
      topic: classroom.currentTopic,
      totalBoardObjects: board.objects.length,
      equationsOnBoard,
      shapesOnBoard,
      recentSpeechTranscripts,
      unansweredStudentQuestions,
      lessonTimelineCount: classroom.lessonTimeline.length,
      activePollQuestion: activePoll ? activePoll.question : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  /**
   * Contextually enrich a prompt with active classroom state
   */
  static buildEnrichedPrompt(basePrompt: string): string {
    const snapshot = ClassroomContextEngine.getSnapshot();

    return `
[Classroom Context]
Subject: ${snapshot.subject}
Topic: ${snapshot.topic}
Active Board Equations: ${snapshot.equationsOnBoard.join(', ') || 'None'}
Active Board Shapes: ${snapshot.shapesOnBoard.join(', ') || 'None'}
Recent Teacher Speech: ${snapshot.recentSpeechTranscripts.slice(-2).join(' | ') || 'None'}
Unanswered Questions: ${snapshot.unansweredStudentQuestions.slice(-2).join(' | ') || 'None'}

User Prompt: "${basePrompt}"
`.trim();
  }
}
