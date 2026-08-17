export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Mesh3D {
  vertices: Vector3D[];
  faces: number[][]; // Indices into vertices
}

export class Geometry3DEngine {
  // Rotate a 3D point around X, Y, Z axes
  rotatePoint(p: Vector3D, angleX: number, angleY: number, angleZ: number = 0): Vector3D {
    // Rotate around X
    const radX = (angleX * Math.PI) / 180;
    const cosX = Math.cos(radX);
    const sinX = Math.sin(radX);
    let y1 = p.y * cosX - p.z * sinX;
    let z1 = p.y * sinX + p.z * cosX;
    let x1 = p.x;

    // Rotate around Y
    const radY = (angleY * Math.PI) / 180;
    const cosY = Math.cos(radY);
    const sinY = Math.sin(radY);
    let x2 = x1 * cosY + z1 * sinY;
    let z2 = -x1 * sinY + z1 * cosY;
    let y2 = y1;

    return { x: x2, y: y2, z: z2 };
  }

  // Perspective 3D to 2D projection
  project3D(p: Vector3D, width: number, height: number, fov: number = 300, cameraZ: number = 400): { x: number; y: number; scale: number } {
    const distance = cameraZ - p.z;
    const scale = distance > 0 ? fov / distance : 1;
    return {
      x: width / 2 + p.x * scale,
      y: height / 2 - p.y * scale,
      scale,
    };
  }

  // Generate 3D Sphere mesh
  createSphereMesh(radius: number, latSegments: number = 16, lonSegments: number = 16): Mesh3D {
    const vertices: Vector3D[] = [];
    const faces: number[][] = [];

    for (let i = 0; i <= latSegments; i++) {
      const theta = (i * Math.PI) / latSegments;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let j = 0; j <= lonSegments; j++) {
        const phi = (j * 2 * Math.PI) / lonSegments;
        const x = radius * sinTheta * Math.cos(phi);
        const y = radius * cosTheta;
        const z = radius * sinTheta * Math.sin(phi);
        vertices.push({ x, y, z });
      }
    }

    for (let i = 0; i < latSegments; i++) {
      for (let j = 0; j < lonSegments; j++) {
        const first = i * (lonSegments + 1) + j;
        const second = first + lonSegments + 1;
        faces.push([first, second, second + 1, first + 1]);
      }
    }

    return { vertices, faces };
  }

  // Generate 3D Cylinder mesh
  createCylinderMesh(radius: number, height: number, segments: number = 16): Mesh3D {
    const vertices: Vector3D[] = [];
    const faces: number[][] = [];
    const halfH = height / 2;

    // Top & Bottom circles
    for (let i = 0; i < segments; i++) {
      const angle = (i * 2 * Math.PI) / segments;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      vertices.push({ x, y: halfH, z }); // Top ring (0 .. n-1)
      vertices.push({ x, y: -halfH, z }); // Bottom ring (n .. 2n-1)
    }

    for (let i = 0; i < segments; i++) {
      const topCurrent = i * 2;
      const bottomCurrent = i * 2 + 1;
      const topNext = ((i + 1) % segments) * 2;
      const bottomNext = ((i + 1) % segments) * 2 + 1;

      faces.push([topCurrent, topNext, bottomNext, bottomCurrent]);
    }

    return { vertices, faces };
  }

  // Generate 3D Cone mesh
  createConeMesh(radius: number, height: number, segments: number = 16): Mesh3D {
    const vertices: Vector3D[] = [];
    const faces: number[][] = [];
    const halfH = height / 2;

    // Apex at top
    vertices.push({ x: 0, y: halfH, z: 0 }); // Index 0

    // Base ring
    for (let i = 0; i < segments; i++) {
      const angle = (i * 2 * Math.PI) / segments;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      vertices.push({ x, y: -halfH, z });
    }

    for (let i = 1; i <= segments; i++) {
      const next = i === segments ? 1 : i + 1;
      faces.push([0, i, next]);
    }

    return { vertices, faces };
  }

  // Mathematical surface calculations
  sphereVolume(radius: number): number {
    return (4 / 3) * Math.PI * Math.pow(radius, 3);
  }
  sphereSurfaceArea(radius: number): number {
    return 4 * Math.PI * Math.pow(radius, 2);
  }
  cylinderVolume(radius: number, height: number): number {
    return Math.PI * Math.pow(radius, 2) * height;
  }
  coneVolume(radius: number, height: number): number {
    return (1 / 3) * Math.PI * Math.pow(radius, 2) * height;
  }
}

export const geometry3DEngine = new Geometry3DEngine();
