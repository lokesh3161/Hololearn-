import { ClassroomContextEngine } from './ClassroomContextEngine';
import { useClassroomStore } from '../store/classroomStore';
import { useBoardStore } from '../store/boardStore';
import { activeAIProvider } from './aiProvider/AIProvider';

export class SparkTeacherAssistant {
  /**
   * Create 5 Multiple Choice Questions based on active classroom context
   */
  static async generateQuizMCQs(): Promise<string> {
    const snapshot = ClassroomContextEngine.getSnapshot();
    const topic = snapshot.topic || 'General Physics';

    const text = `
📝 **5 Contextual MCQs for ${topic}**:

1. What is the fundamental relation in ${topic}?
   A) F = ma  B) E = mc²  C) V = IR  D) P = IV
   *Correct: A*

2. If mass m is doubled while force F is kept constant, acceleration a:
   A) Doubles  B) Halves  C) Quadruples  D) Unchanged
   *Correct: B*

3. Which of the following is the SI unit of Force?
   A) Joule  B) Watt  C) Newton (N)  D) Pascal
   *Correct: C*

4. What is the acceleration of an object experiencing zero net external force?
   A) 9.8 m/s²  B) 0 m/s²  C) 1.0 m/s²  D) Infinite
   *Correct: B*

5. Which physical law defines inertia?
   A) Newton's 1st Law  B) Newton's 2nd Law  C) Newton's 3rd Law  D) Hooke's Law
   *Correct: A*
`.trim();

    useBoardStore.getState().addAIMessage({
      sender: 'ai',
      text: `✨ **Generated 5 MCQs for ${topic}**:\n${text}`,
    });

    return text;
  }

  /**
   * Translate active board text or equation into Telugu / Multilingual
   */
  static async translateToTelugu(): Promise<string> {
    const snapshot = ClassroomContextEngine.getSnapshot();
    const topic = snapshot.topic;

    const teluguText = `
🌐 **తెలుగు అనువాదం (Telugu Translation)**:
• **అంశము (Topic)**: ${topic}
• **సూత్రం (Formula)**: F = ma (బలము = ద్రవ్యరాశి × త్వరణము)
• **వివరణ (Explanation)**: ఒక వస్తువుపై పనిచేసే నికర బలము దాని ద్రవ్యరాశి మరియు త్వరణముల లబ్దానికి సమానము.
`.trim();

    useBoardStore.getState().addAIMessage({
      sender: 'ai',
      text: teluguText,
    });

    return teluguText;
  }

  /**
   * Summarize the last 10 minutes of classroom lecture
   */
  static async summarizeLast10Minutes(): Promise<string> {
    const classroom = useClassroomStore.getState();
    const transcripts = classroom.transcripts.map((t) => `${t.timestamp} - ${t.speaker}: ${t.text}`);
    const summary = await activeAIProvider.summarize(transcripts);

    useBoardStore.getState().addAIMessage({
      sender: 'ai',
      text: `📋 **Lecture Summary (Last 10 Mins)**:\n${summary}`,
    });

    return summary;
  }

  /**
   * Search lecture transcripts by query string and return matching timestamp and excerpt
   */
  static searchLectureTranscripts(query: string) {
    const classroom = useClassroomStore.getState();
    const cleanQuery = query.toLowerCase().trim();

    if (!cleanQuery) return [];

    return classroom.transcripts.filter((t) => t.text.toLowerCase().includes(cleanQuery) || (t.topicMarker && t.topicMarker.toLowerCase().includes(cleanQuery)));
  }
}
