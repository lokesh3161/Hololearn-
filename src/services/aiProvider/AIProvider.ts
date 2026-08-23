export interface AIUnderstandRequest {
  rawInput: string;
  contextSubject?: string;
  contextTopic?: string;
  boardObjectsCount?: number;
}

export interface AIUnderstandResponse {
  intent: 'plot_graph' | 'solve_equation' | 'convert_3d' | 'explain_concept' | 'create_quiz' | 'translate' | 'general';
  recognizedExpression?: string;
  latex?: string;
  shapeType?: string;
  explanation?: string;
  confidence: number;
}

export interface AIGenerateRequest {
  prompt: string;
  systemContext?: string;
  language?: string;
  gradeLevel?: string;
}

export interface AIGenerateResponse {
  text: string;
  structuredData?: any;
}

export interface AIProvider {
  id: string;
  name: string;
  isLocal: boolean;
  understand(request: AIUnderstandRequest): Promise<AIUnderstandResponse>;
  generate(request: AIGenerateRequest): Promise<AIGenerateResponse>;
  summarize(transcript: string[]): Promise<string>;
}

/**
 * Local Deterministic / Rule-based AI Provider (Offline-First)
 */
export class LocalEngineProvider implements AIProvider {
  id = 'local-engine';
  name = 'Local Offline Engine';
  isLocal = true;

  async understand(request: AIUnderstandRequest): Promise<AIUnderstandResponse> {
    const input = request.rawInput.trim().toLowerCase();

    if (input.includes('y=') || input.includes('y =') || input.includes('x^2') || input.includes('sin(') || input.includes('cos(')) {
      return {
        intent: 'plot_graph',
        recognizedExpression: request.rawInput,
        latex: request.rawInput,
        confidence: 0.95,
      };
    }

    if (input.includes('triangle') || input.includes('cube') || input.includes('sphere') || input.includes('cylinder') || input.includes('cone')) {
      const shapeType = input.includes('cube') ? 'cube' : input.includes('sphere') ? 'sphere' : input.includes('cylinder') ? 'cylinder' : input.includes('cone') ? 'cone' : 'triangle';
      return {
        intent: 'convert_3d',
        shapeType,
        confidence: 0.92,
      };
    }

    if (input.includes('solve') || input.includes('=')) {
      return {
        intent: 'solve_equation',
        recognizedExpression: request.rawInput,
        latex: request.rawInput,
        confidence: 0.9,
      };
    }

    return {
      intent: 'explain_concept',
      explanation: `Local Analysis: "${request.rawInput}" is identified in ${request.contextSubject || 'General Science'} context.`,
      confidence: 0.85,
    };
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    return {
      text: `[Local Engine]: Generated lesson content for "${request.prompt}".`,
    };
  }

  async summarize(transcript: string[]): Promise<string> {
    if (transcript.length === 0) return 'No speech recorded yet.';
    return `Lecture Summary (${transcript.length} segments): Covered core principles including ${transcript.slice(-3).join(', ')}.`;
  }
}

/**
 * Spark AI Provider (Default Multi-Modal AI Engine)
 */
export class SparkAIProvider implements AIProvider {
  id = 'spark-ai';
  name = 'HoloLearn Spark AI Engine';
  isLocal = false;

  private localFallback = new LocalEngineProvider();

  async understand(request: AIUnderstandRequest): Promise<AIUnderstandResponse> {
    return this.localFallback.understand(request);
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    return {
      text: `✨ [Spark AI]: ${request.prompt}`,
    };
  }

  async summarize(transcript: string[]): Promise<string> {
    return this.localFallback.summarize(transcript);
  }
}

export const activeAIProvider: AIProvider = new SparkAIProvider();
