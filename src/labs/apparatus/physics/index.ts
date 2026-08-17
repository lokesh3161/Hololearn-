// Apparatus definitions and properties for physics components

export interface ApparatusSpec {
  id: string;
  name: string;
  specs: string;
  instructions: string;
}

export const PHYSICS_APPARATUS_LIST: Record<string, ApparatusSpec> = {
  cart: {
    id: 'cart',
    name: 'Dynamics Cart',
    specs: '500g base mass with low-friction wheels',
    instructions: 'Place on horizontal dynamics track.',
  },
  track: {
    id: 'track',
    name: 'Horizontal Track',
    specs: '1.5m aluminum track with millimeter ruler',
    instructions: 'Level using adjustable feet.',
  },
  pulley: {
    id: 'pulley',
    name: 'Low-friction Pulley',
    specs: 'Precision ball-bearing wheel',
    instructions: 'Mount at track end.',
  },
  spring: {
    id: 'spring',
    name: 'Helical Spring',
    specs: 'k = 25 N/m spring constant',
    instructions: 'Suspend vertically from clamp stand.',
  },
  pendulum: {
    id: 'pendulum',
    name: 'Simple Pendulum',
    specs: 'Brass bob with adjustable string length',
    instructions: 'Displace by <10° angle and release.',
  },
};
