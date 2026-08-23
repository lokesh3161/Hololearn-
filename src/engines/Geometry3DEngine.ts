export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Geometry3DData {
  shapeType: string;
  name: string;
  facesCount: number;
  edgesCount: number;
  verticesCount: number;
  volumeFormula: string;
  surfaceAreaFormula: string;
}

export interface Mesh3D {
  vertices: Vector3D[];
  faces: number[][];
}

export class Geometry3DEngine {
  static rotatePoint(point: Vector3D, rx: number, ry: number, rz: number = 0): Vector3D {
    const radX = (rx * Math.PI) / 180;
    const radY = (ry * Math.PI) / 180;
    const radZ = (rz * Math.PI) / 180;

    // Rotate Y
    let x1 = point.x * Math.cos(radY) + point.z * Math.sin(radY);
    let y1 = point.y;
    let z1 = -point.x * Math.sin(radY) + point.z * Math.cos(radY);

    // Rotate X
    let x2 = x1;
    let y2 = y1 * Math.cos(radX) - z1 * Math.sin(radX);
    let z2 = y1 * Math.sin(radX) + z1 * Math.cos(radX);

    // Rotate Z
    let x3 = x2 * Math.cos(radZ) - y2 * Math.sin(radZ);
    let y3 = x2 * Math.sin(radZ) + y2 * Math.cos(radZ);
    let z3 = z2;

    return { x: x3, y: y3, z: z3 };
  }

  static rotateX(v: Vector3D, angleDeg: number): Vector3D {
    return Geometry3DEngine.rotatePoint(v, angleDeg, 0, 0);
  }

  static rotateY(v: Vector3D, angleDeg: number): Vector3D {
    return Geometry3DEngine.rotatePoint(v, 0, angleDeg, 0);
  }

  static project3D(
    point: Vector3D,
    width: number = 400,
    height: number = 300,
    fov: number = 320,
    distance: number = 450
  ): { x: number; y: number; scale: number } {
    const scale = fov / Math.max(1, distance + point.z);
    return {
      x: width / 2 + point.x * scale,
      y: height / 2 - point.y * scale,
      scale,
    };
  }

  static project(v: Vector3D, width: number, height: number, fov: number = 300): { x: number; y: number } {
    return Geometry3DEngine.project3D(v, width, height, fov, 450);
  }

  static createSphereMesh(radius: number, latBands: number = 12, longBands: number = 12): Mesh3D {
    const vertices: Vector3D[] = [];
    const faces: number[][] = [];

    for (let lat = 0; lat <= latBands; lat++) {
      const theta = (lat * Math.PI) / latBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let long = 0; long <= longBands; long++) {
        const phi = (long * 2 * Math.PI) / longBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        vertices.push({
          x: radius * sinTheta * cosPhi,
          y: radius * cosTheta,
          z: radius * sinTheta * sinPhi,
        });
      }
    }

    for (let lat = 0; lat < latBands; lat++) {
      for (let long = 0; long < longBands; long++) {
        const first = lat * (longBands + 1) + long;
        const second = first + longBands + 1;
        faces.push([first, second, second + 1, first + 1]);
      }
    }

    return { vertices, faces };
  }

  static createCylinderMesh(radius: number, height: number, segments: number = 16): Mesh3D {
    const vertices: Vector3D[] = [];
    const faces: number[][] = [];
    const halfH = height / 2;

    for (let i = 0; i < segments; i++) {
      const theta = (i * 2 * Math.PI) / segments;
      const x = radius * Math.cos(theta);
      const z = radius * Math.sin(theta);
      vertices.push({ x, y: halfH, z });
      vertices.push({ x, y: -halfH, z });
    }

    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      faces.push([i * 2, next * 2, next * 2 + 1, i * 2 + 1]);
    }

    return { vertices, faces };
  }

  static createConeMesh(radius: number, height: number, segments: number = 16): Mesh3D {
    const vertices: Vector3D[] = [];
    const faces: number[][] = [];
    const halfH = height / 2;

    vertices.push({ x: 0, y: halfH, z: 0 }); // Apex
    for (let i = 0; i < segments; i++) {
      const theta = (i * 2 * Math.PI) / segments;
      vertices.push({
        x: radius * Math.cos(theta),
        y: -halfH,
        z: radius * Math.sin(theta),
      });
    }

    for (let i = 1; i <= segments; i++) {
      const next = i === segments ? 1 : i + 1;
      faces.push([0, i, next]);
    }

    return { vertices, faces };
  }

  static sphereVolume(radius: number): number {
    return (4 / 3) * Math.PI * Math.pow(radius, 3);
  }

  static cylinderVolume(radius: number, height: number): number {
    return Math.PI * Math.pow(radius, 2) * height;
  }

  static coneVolume(radius: number, height: number): number {
    return (1 / 3) * Math.PI * Math.pow(radius, 2) * height;
  }

  static sphereSurfaceArea(radius: number): number {
    return 4 * Math.PI * Math.pow(radius, 2);
  }

  static getGeometry3DData(shapeType: string): Geometry3DData {
    const type = shapeType.toLowerCase();

    if (type.includes('cube')) {
      return {
        shapeType: 'cube',
        name: '3D Regular Cube',
        facesCount: 6,
        edgesCount: 12,
        verticesCount: 8,
        volumeFormula: 'V = a³',
        surfaceAreaFormula: 'A = 6a²',
      };
    }

    if (type.includes('sphere')) {
      return {
        shapeType: 'sphere',
        name: '3D Sphere',
        facesCount: 1,
        edgesCount: 0,
        verticesCount: 0,
        volumeFormula: 'V = (4/3)πr³',
        surfaceAreaFormula: 'A = 4πr²',
      };
    }

    if (type.includes('cylinder')) {
      return {
        shapeType: 'cylinder',
        name: '3D Circular Cylinder',
        facesCount: 3,
        edgesCount: 2,
        verticesCount: 0,
        volumeFormula: 'V = πr²h',
        surfaceAreaFormula: 'A = 2πr(r + h)',
      };
    }

    if (type.includes('cone')) {
      return {
        shapeType: 'cone',
        name: '3D Right Circular Cone',
        facesCount: 2,
        edgesCount: 1,
        verticesCount: 1,
        volumeFormula: 'V = (1/3)πr²h',
        surfaceAreaFormula: 'A = πr(r + √(r² + h²))',
      };
    }

    return {
      shapeType: 'pyramid',
      name: '3D Triangular Pyramid (Tetrahedron)',
      facesCount: 4,
      edgesCount: 6,
      verticesCount: 4,
      volumeFormula: 'V = (1/3) A_base × h',
      surfaceAreaFormula: 'A = A_base + (3/2) b s',
    };
  }
}

export const geometry3DEngine = Geometry3DEngine;
