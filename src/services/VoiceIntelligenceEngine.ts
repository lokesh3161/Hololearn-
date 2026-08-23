import { useClassroomStore } from '../store/classroomStore';
import { useBoardStore } from '../store/boardStore';
import { activeAIProvider } from './aiProvider/AIProvider';

export class VoiceIntelligenceEngine {
  private static recognition: any = null;
  private static isListening: boolean = false;

  /**
   * Initialize Web Speech API recognition listener
   */
  static initSpeechRecognition(
    onResultCallback?: (text: string) => void,
    onErrorCallback?: (err: string) => void
  ) {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser environment.');
      return;
    }

    VoiceIntelligenceEngine.recognition = new SpeechRecognition();
    VoiceIntelligenceEngine.recognition.continuous = true;
    VoiceIntelligenceEngine.recognition.interimResults = false;
    VoiceIntelligenceEngine.recognition.lang = 'en-US';

    VoiceIntelligenceEngine.recognition.onresult = async (event: any) => {
      const current = event.resultIndex;
      const transcriptText = event.results[current][0].transcript.trim();

      if (transcriptText) {
        if (onResultCallback) onResultCallback(transcriptText);
        await VoiceIntelligenceEngine.processSpokenCommand(transcriptText);
      }
    };

    VoiceIntelligenceEngine.recognition.onerror = (event: any) => {
      if (onErrorCallback) onErrorCallback(event.error);
    };
  }

  /**
   * Toggle Voice Listening Mode
   */
  static toggleListening(onStatusChange?: (listening: boolean) => void): boolean {
    if (!VoiceIntelligenceEngine.recognition) {
      VoiceIntelligenceEngine.initSpeechRecognition();
    }

    if (!VoiceIntelligenceEngine.recognition) {
      return false;
    }

    if (VoiceIntelligenceEngine.isListening) {
      VoiceIntelligenceEngine.recognition.stop();
      VoiceIntelligenceEngine.isListening = false;
      if (onStatusChange) onStatusChange(false);
      return false;
    } else {
      try {
        VoiceIntelligenceEngine.recognition.start();
        VoiceIntelligenceEngine.isListening = true;
        if (onStatusChange) onStatusChange(true);
        return true;
      } catch {
        VoiceIntelligenceEngine.isListening = false;
        if (onStatusChange) onStatusChange(false);
        return false;
      }
    }
  }

  /**
   * Process spoken command and perform intelligent canvas actions
   */
  static async processSpokenCommand(spokenText: string) {
    const classroom = useClassroomStore.getState();
    const board = useBoardStore.getState();

    // 1. Add transcript segment
    classroom.addTranscriptSegment(spokenText, 'Teacher');

    // 2. Perform AI intent understanding
    const understanding = await activeAIProvider.understand({
      rawInput: spokenText,
      contextSubject: classroom.currentSubject,
      contextTopic: classroom.currentTopic,
    });

    // 3. Execute intent
    if (understanding.intent === 'plot_graph' && understanding.recognizedExpression) {
      const eqObj = {
        id: `eq-voice-${Date.now()}`,
        type: 'equation' as const,
        points: [{ x: 300, y: 220 }],
        x: 300,
        y: 220,
        width: 200,
        height: 50,
        strokeColor: '#06b6d4',
        strokeWidth: 2,
        opacity: 1,
        mathLatex: understanding.recognizedExpression,
        zIndex: 2,
        isGlowing: true,
      };
      board.addObject(eqObj);
      board.addAIMessage({
        sender: 'ai',
        text: `🎙️ Voice Command Executed: Plotted graph for "${understanding.recognizedExpression}".`,
      });
    } else if (understanding.intent === 'create_quiz') {
      classroom.createStudentPoll(
        `Class Poll on ${classroom.currentTopic}:`,
        ['Option A: Correct', 'Option B: Incorrect', 'Option C: Needs revision', 'Option D: Unsure']
      );
      board.addAIMessage({
        sender: 'ai',
        text: `🎙️ Voice Command Executed: Created interactive live quiz poll for "${classroom.currentTopic}".`,
      });
    } else {
      board.addAIMessage({
        sender: 'ai',
        text: `🎙️ Voice Command Heard: "${spokenText}" (${understanding.intent})`,
      });
    }
  }
}
