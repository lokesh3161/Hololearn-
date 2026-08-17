import { MechanicsEngine } from './MechanicsEngine';

// Self-contained unit test suite for MechanicsEngine
export function runMechanicsEngineTests() {
  console.assert(MechanicsEngine.acceleration(10, 2) === 5, 'acceleration failed');
  console.assert(MechanicsEngine.force(2, 5) === 10, 'force failed');
  console.assert(MechanicsEngine.netForce([10, -3, 2]) === 9, 'netForce failed');
  console.assert(Math.abs(MechanicsEngine.range(20, 45) - 40.77) < 0.5, 'range failed');
  console.assert(MechanicsEngine.momentum(5, 4) === 20, 'momentum failed');
  console.assert(MechanicsEngine.elasticV1(2, 2, 5, 0) === 0, 'elasticV1 failed');
  console.assert(MechanicsEngine.elasticV2(2, 2, 5, 0) === 5, 'elasticV2 failed');
  console.assert(MechanicsEngine.kineticEnergy(2, 3) === 9, 'kineticEnergy failed');
  console.assert(MechanicsEngine.frictionForce(0.5, 20) === 10, 'frictionForce failed');
  console.assert(MechanicsEngine.springForce(25, 0.2) === 5, 'springForce failed');
  console.assert(Math.abs(MechanicsEngine.pendulumPeriod(1.0) - 2.006) < 0.05, 'pendulumPeriod failed');
  console.assert(Math.abs(MechanicsEngine.freeFallTime(1.0) - 0.451) < 0.05, 'freeFallTime failed');
  console.assert(MechanicsEngine.torque(10, 2, 90) === 20, 'torque failed');
  console.assert(MechanicsEngine.centripetalForce(2, 4, 1) === 32, 'centripetalForce failed');
  return true;
}
