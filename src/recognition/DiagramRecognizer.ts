import type { Point, BoundingBox } from './types';
import type { CanvasObject, SimulationId } from '../types/canvas';

export interface DiagramMatch {
  type: 'fbd' | 'inclined_plane' | 'circuit' | 'ray_diagram' | 'axes' | 'spring' | 'unknown';
  displayName: string;
  confidence: number;
  simulationType: SimulationId;
  description: string;
  involvedObjectIds: string[];
}

export class DiagramRecognizer {
  analyzeDiagram(objects: CanvasObject[]): DiagramMatch | null {
    if (!objects || objects.length === 0) return null;

    // Filter relevant strokes & shapes
    const shapes = objects.filter(o => o.type === 'stroke' || o.type === 'shape');
    if (shapes.length === 0) return null;

    // 1. Detect Free Body Diagram (Block + Force Arrows)
    const fbdMatch = this.detectFreeBodyDiagram(shapes);
    if (fbdMatch) return fbdMatch;

    // 2. Detect Inclined Plane (Triangle + Box or Angle)
    const inclinedMatch = this.detectInclinedPlane(shapes);
    if (inclinedMatch) return inclinedMatch;

    // 3. Detect Circuit Diagram (Rectangular loop / Battery / Resistor)
    const circuitMatch = this.detectCircuit(shapes);
    if (circuitMatch) return circuitMatch;

    // 4. Detect Coordinate Axes (Cross / Perpendicular lines)
    const axesMatch = this.detectAxes(shapes);
    if (axesMatch) return axesMatch;

    // 5. Detect Spring-Mass System
    const springMatch = this.detectSpring(shapes);
    if (springMatch) return springMatch;

    return null;
  }

  private detectFreeBodyDiagram(shapes: CanvasObject[]): DiagramMatch | null {
    const rects = shapes.filter(
      (s) => s.recognizedShapeType === 'rectangle' || s.shapeSubtype === 'rectangle' || s.shapeSubtype === 'circle'
    );
    const arrows = shapes.filter(
      (s) => s.recognizedShapeType === 'arrow' || s.recognizedShapeType === 'line' || s.shapeSubtype === 'arrow' || s.shapeSubtype === 'line'
    );

    if (rects.length >= 1 && arrows.length >= 1) {
      const mainRect = rects[rects.length - 1];
      const rectBbox = { x: mainRect.x, y: mainRect.y, width: mainRect.width, height: mainRect.height };

      // Check if arrow starts or touches the block
      for (const arrow of arrows) {
        const arrowBbox = { x: arrow.x, y: arrow.y, width: arrow.width, height: arrow.height };
        const isNear =
          Math.abs(arrowBbox.x - rectBbox.x) < rectBbox.width * 2 &&
          Math.abs(arrowBbox.y - rectBbox.y) < rectBbox.height * 2;

        if (isNear) {
          return {
            type: 'fbd',
            displayName: 'Free-Body Diagram',
            confidence: 0.92,
            simulationType: 'newton',
            description: 'Interactive Dynamics & Mass-Force Vector Simulation',
            involvedObjectIds: [mainRect.id, arrow.id],
          };
        }
      }
    }
    return null;
  }

  private detectInclinedPlane(shapes: CanvasObject[]): DiagramMatch | null {
    const triangles = shapes.filter(
      (s) => s.recognizedShapeType === 'triangle' || s.shapeSubtype === 'triangle'
    );
    const objectsOnTop = shapes.filter(
      (s) => s.recognizedShapeType === 'rectangle' || s.shapeSubtype === 'rectangle'
    );

    if (triangles.length >= 1) {
      const tri = triangles[triangles.length - 1];
      const hasBlock = objectsOnTop.some(
        (b) => Math.abs(b.x - tri.x) < tri.width * 1.5 && Math.abs(b.y - tri.y) < tri.height * 1.5
      );

      return {
        type: 'inclined_plane',
        displayName: 'Inclined Plane Dynamics',
        confidence: hasBlock ? 0.95 : 0.85,
        simulationType: 'newton',
        description: 'Inclined plane friction & normal force dynamics',
        involvedObjectIds: [tri.id],
      };
    }
    return null;
  }

  private detectCircuit(shapes: CanvasObject[]): DiagramMatch | null {
    const circuitSymbols = shapes.filter(
      (s) =>
        s.recognizedShapeType === 'circuit_symbol' ||
        s.text?.toLowerCase().includes('v') ||
        s.text?.toLowerCase().includes('r') ||
        s.text?.toLowerCase().includes('ohm')
    );

    if (circuitSymbols.length >= 1 || shapes.length >= 4) {
      // Check if bounding boxes form a loop or circuit diagram
      const totalWidth = Math.max(...shapes.map((s) => s.x + s.width)) - Math.min(...shapes.map((s) => s.x));
      const totalHeight = Math.max(...shapes.map((s) => s.y + s.height)) - Math.min(...shapes.map((s) => s.y));

      if (totalWidth > 150 && totalHeight > 100 && shapes.length >= 3) {
        return {
          type: 'circuit',
          displayName: 'Electrical Circuit Topology',
          confidence: 0.88,
          simulationType: 'ohm',
          description: 'Interactive Current & Resistance Circuit Simulator',
          involvedObjectIds: shapes.map((s) => s.id),
        };
      }
    }
    return null;
  }

  private detectAxes(shapes: CanvasObject[]): DiagramMatch | null {
    const lines = shapes.filter(
      (s) => s.recognizedShapeType === 'line' || s.shapeSubtype === 'line' || s.recognizedShapeType === 'arrow'
    );

    if (lines.length >= 2) {
      // Check for two perpendicular lines
      const l1 = lines[lines.length - 2];
      const l2 = lines[lines.length - 1];

      const isPerp =
        (l1.width > l1.height * 3 && l2.height > l2.width * 3) ||
        (l2.width > l2.height * 3 && l1.height > l1.width * 3);

      if (isPerp) {
        return {
          type: 'axes',
          displayName: 'Coordinate Axes System',
          confidence: 0.94,
          simulationType: 'graph',
          description: 'Function Graphing & Coordinate Geometry Engine',
          involvedObjectIds: [l1.id, l2.id],
        };
      }
    }
    return null;
  }

  private detectSpring(shapes: CanvasObject[]): DiagramMatch | null {
    const springs = shapes.filter(
      (s) => s.recognizedShapeType === 'spring' || s.text?.toLowerCase().includes('k')
    );

    if (springs.length >= 1) {
      return {
        type: 'spring',
        displayName: 'Spring-Mass Oscillator',
        confidence: 0.90,
        simulationType: 'shm',
        description: 'Simple Harmonic Motion & Hooke\'s Law Simulator',
        involvedObjectIds: springs.map((s) => s.id),
      };
    }
    return null;
  }
}
