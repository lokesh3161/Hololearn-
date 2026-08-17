import type { CanvasObject, DetectionResult, BoundingBox, Point, SimulationId } from '../types/canvas';
import { detectEquation } from '../registry/equationRegistry';
import type { ActionType } from '../registry/types';

import { ShapeRecognitionEngine } from '../recognition/ShapeRecognitionEngine';

let idleTimer: ReturnType<typeof setTimeout> | null = null;
const shapeEngine = new ShapeRecognitionEngine();

export function calculateBoundingBox(points: Point[]): BoundingBox {
  if (!points || points.length === 0) {
    return { x: 0, y: 0, width: 100, height: 100 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  points.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  });

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 20),
    height: Math.max(maxY - minY, 20),
  };
}

export function analyzeShape(obj: CanvasObject): { type: string; confidence: number } | null {
  const pts = obj.points;
  if (!pts || pts.length < 5) return null;

  const recResult = shapeEngine.recognizeSync(obj.id, pts);
  if (!recResult || !recResult.best || recResult.best.confidence < 0.3) return null;

  const best = recResult.best;
  const nameMap: Record<string, string> = {
    circle: 'Circle',
    ellipse: 'Ellipse',
    rectangle: 'Rectangle',
    square: 'Square',
    triangle: 'Triangle',
    line: 'Line / Vector',
    arrow: 'Arrow',
    polygon: 'Polygon',
    arc: 'Arc',
  };

  const displayName = nameMap[best.type] || best.type.charAt(0).toUpperCase() + best.type.slice(1);
  return { type: displayName, confidence: best.confidence };
}

export function analyzeEquationText(text: string): Omit<DetectionResult, 'objectId' | 'boundingBox'> | null {
  console.log('[Pipeline Step 2] Detection service received input string:', text);
  const regMatch = detectEquation(text);
  if (regMatch.entry) {
    const entry = regMatch.entry;
    console.log('[Pipeline Step 3 & 4] Registry matched equation:', entry.displayName, 'Simulation:', entry.simulationType);
    const actionMap: Record<ActionType, 'Convert' | 'Explain' | 'Visualize' | 'Simulate' | 'Quiz'> = {
      explain: 'Explain',
      visualize: 'Visualize',
      simulate: 'Simulate',
      quiz: 'Quiz',
      practice: 'Quiz',
      graph: 'Visualize',
      solve: 'Explain',
      example: 'Explain',
      simplify: 'Explain',
    };

    const actions: string[] = Array.from(
      new Set(entry.availableActions.map((act) => actionMap[act] || 'Explain'))
    ).slice(0, 4);

    if (!actions.includes('Simulate')) {
      actions.push('Simulate');
    }
    if (!actions.includes('Open Virtual Lab')) {
      actions.push('Open Virtual Lab');
    }

    return {
      type: 'equation',
      detectedName: `${entry.displayName} (${entry.latex})`,
      confidence: regMatch.confidence,
      mathFormula: entry.latex,
      suggestedActions: actions as ('Convert' | 'Explain' | 'Visualize' | 'Simulate' | 'Quiz' | 'Open Virtual Lab')[],
      simulationType: entry.simulationType || 'newton',
    };
  }

  console.log('[Pipeline Step 3 & 4] No direct registry match for:', text, '- checking fallback math grapher...');
  // Math Function Grapher Fallback (y = f(x), quadratics, trig, etc.)
  const trimmed = text.trim();
  const isGraphable =
    /^y\s*=/i.test(trimmed) ||
    /x\s*[\^\²\³\+\-\*\/]/i.test(trimmed) ||
    /sin|cos|tan|log|ln|exp|sqrt/i.test(trimmed) ||
    /x\^2|x²/i.test(trimmed) ||
    /x\^3|x³/i.test(trimmed) ||
    /x²\s*\+\s*y²/i.test(trimmed);

  if (isGraphable) {
    console.log('[Pipeline Step 4] Math Function Grapher detected for:', trimmed);
    return {
      type: 'equation',
      detectedName: `Function Grapher (${trimmed})`,
      confidence: 0.90,
      mathFormula: trimmed,
      suggestedActions: ['Simulate', 'Explain', 'Visualize', 'Quiz'],
      simulationType: 'graph',
    };
  }

  return null;
}

function getSimulationForShape(shapeType: string): SimulationId {
  switch (shapeType.toLowerCase()) {
    case 'circle':
      return 'circle-area';
    case 'ellipse':
      return 'gravitation';
    case 'rectangle':
    case 'square':
    case 'polygon':
      return 'graph';
    case 'line / vector':
    case 'line':
    case 'arrow':
      return 'newton';
    case 'triangle':
      return 'graph';
    case 'arc':
      return 'pendulum';
    default:
      return 'newton';
  }
}

export function scheduleDetection(
  obj: CanvasObject,
  onDetect: (result: DetectionResult) => void
) {
  if (idleTimer) clearTimeout(idleTimer);

  idleTimer = setTimeout(() => {
    console.log('[Pipeline Step 1] Triggering detection for object:', obj.id, 'type:', obj.type);
    let result: Omit<DetectionResult, 'objectId' | 'boundingBox'> | null = null;

    if (obj.type === 'equation' || obj.type === 'text') {
      const textToAnalyze = obj.mathLatex || obj.text || '';
      result = analyzeEquationText(textToAnalyze);
    }

    if (!result && obj.type === 'stroke') {
      const shapeRes = analyzeShape(obj);
      if (shapeRes) {
        result = {
          type: 'shape',
          detectedName: `${shapeRes.type} Detected`,
          confidence: shapeRes.confidence,
          suggestedActions: ['Convert', 'Explain', 'Visualize', 'Simulate'],
          simulationType: getSimulationForShape(shapeRes.type),
        };
      }
    }

    if (result && result.confidence >= 0.4) {
      console.log('[Pipeline Step 5] Dispatching detection result to UI:', result);
      const bbox = {
        x: obj.x,
        y: obj.y,
        width: obj.width || 120,
        height: obj.height || 60,
      };

      onDetect({
        objectId: obj.id,
        boundingBox: bbox,
        ...result,
      });
    }
  }, 300);
}
