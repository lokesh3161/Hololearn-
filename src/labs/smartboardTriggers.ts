export interface SmartboardTriggerMapping {
  equationPattern: string | RegExp;
  conceptKeywords: string[];
  labId: string;
  labTitle: string;
  actionLabel: string; // e.g. '🧪 Open Lab'
}

export const SMARTBOARD_LAB_TRIGGERS: SmartboardTriggerMapping[] = [
  {
    equationPattern: /F\s*=\s*m\s*a/i,
    conceptKeywords: ['newton', 'force', 'acceleration', 'mass', 'second law'],
    labId: 'newtons-second-law',
    labTitle: "Newton's Second Law Lab",
    actionLabel: '🧪 Open Newton\'s Law Lab',
  },
  {
    equationPattern: /f\s*=\s*\\?mu\s*N|\\?mu/i,
    conceptKeywords: ['friction', 'static', 'kinetic', 'normal force'],
    labId: 'friction-lab',
    labTitle: 'Friction & Coefficients Lab',
    actionLabel: '🧪 Open Friction Lab',
  },
  {
    equationPattern: /projectile|R\s*=\s*v\^?2\s*sin/i,
    conceptKeywords: ['projectile', 'trajectory', 'launch angle', 'range'],
    labId: 'projectile-motion',
    labTitle: 'Projectile Motion Lab',
    actionLabel: '🧪 Open Projectile Lab',
  },
  {
    equationPattern: /p\s*=\s*m\s*v|m_1\s*v_/i,
    conceptKeywords: ['momentum', 'collision', 'conservation of momentum'],
    labId: 'momentum-conservation',
    labTitle: 'Momentum & Collisions Lab',
    actionLabel: '🧪 Open Momentum Lab',
  },
  {
    equationPattern: /KE\s*\+\s*PE|E_\{?total\}?/i,
    conceptKeywords: ['energy', 'potential energy', 'kinetic energy', 'conservation of energy'],
    labId: 'conservation-of-energy',
    labTitle: 'Conservation of Energy Lab',
    actionLabel: '🧪 Open Energy Lab',
  },
  {
    equationPattern: /\\?tau\s*=\s*F\s*r/i,
    conceptKeywords: ['torque', 'fulcrum', 'lever', 'equilibrium'],
    labId: 'torque-equilibrium',
    labTitle: 'Torque & Equilibrium Lab',
    actionLabel: '🧪 Open Torque Lab',
  },
  {
    equationPattern: /F\s*=\s*m\s*v\^?2\s*\/\s*r|a_c\s*=/i,
    conceptKeywords: ['centripetal', 'circular motion', 'angular velocity'],
    labId: 'centripetal-force',
    labTitle: 'Centripetal Force Lab',
    actionLabel: '🧪 Open Centripetal Lab',
  },
  {
    equationPattern: /F\s*=\s*-?k\s*x/i,
    conceptKeywords: ['hooke', 'spring constant', 'elasticity', 'restoring force', 'extension'],
    labId: 'hookes-law',
    labTitle: "Hooke's Law & Spring Constant Lab",
    actionLabel: '🧪 Open Hooke\'s Law Lab',
  },
  {
    equationPattern: /T\s*=\s*2\s*\\?pi\s*\\?sqrt|\\?sqrt\{L\/g\}/i,
    conceptKeywords: ['pendulum', 'simple harmonic motion', 'shm', 'period', 'oscillation'],
    labId: 'simple-pendulum',
    labTitle: 'Simple Pendulum & g Determination Lab',
    actionLabel: '🧪 Open Pendulum Lab',
  },
  {
    equationPattern: /h\s*=\s*(?:1\/2|0\.5)\s*g\s*t\^?2|g\s*=\s*2h\/t\^?2/i,
    conceptKeywords: ['free fall', 'gravity', 'acceleration due to gravity', 'falling body'],
    labId: 'free-fall',
    labTitle: 'Free Fall & g Measurement Lab',
    actionLabel: '🧪 Open Free Fall Lab',
  },
  {
    equationPattern: /V\s*=\s*I\s*R/i,
    conceptKeywords: ['ohm', 'ohms law', 'resistance', 'voltage', 'current'],
    labId: 'ohms-law',
    labTitle: "Ohm's Law & Resistance Lab",
    actionLabel: '🧪 Open Ohm\'s Law Lab',
  },
  {
    equationPattern: /Q\s*=\s*m\s*c\s*\\?Delta\s*T/i,
    conceptKeywords: ['specific heat', 'calorimetry', 'heat capacity', 'temperature rise'],
    labId: 'specific-heat',
    labTitle: 'Specific Heat Capacity Lab',
    actionLabel: '🧪 Open Specific Heat Lab',
  },
  {
    equationPattern: /NaOH\s*\+\s*HCl/i,
    conceptKeywords: ['titration', 'acid base', 'burette', 'pipette', 'neutralization', 'endpoint'],
    labId: 'acid-base-titration',
    labTitle: 'Acid-Base Titration Lab',
    actionLabel: '🧪 Open Titration Lab',
  },
  {
    equationPattern: /Na2S2O3|Na_2S_2O_3/i,
    conceptKeywords: ['reaction rate', 'kinetics', 'thiosulfate', 'disappearing cross'],
    labId: 'reaction-rates',
    labTitle: 'Chemical Reaction Rates Lab',
    actionLabel: '🧪 Open Reaction Rates Lab',
  },
  {
    equationPattern: /q\s*=\s*m\s*c\s*\\?Delta\s*T|\\?Delta\s*H\s*=/i,
    conceptKeywords: ['calorimetry', 'enthalpy', 'neutralization heat'],
    labId: 'enthalpy-calorimetry',
    labTitle: 'Enthalpy Calorimetry Lab',
    actionLabel: '🧪 Open Calorimetry Lab',
  },
  {
    equationPattern: /m\s*=\s*z\s*I\s*t|Cu\^\{?2\+\}?/i,
    conceptKeywords: ['electrolysis', 'faraday law', 'copper electroplating', 'electrochemistry'],
    labId: 'copper-electrolysis',
    labTitle: 'Copper Electrolysis & Faraday Lab',
    actionLabel: '🧪 Open Electrolysis Lab',
  },
  {
    equationPattern: /\\?sin\(?i\)?\s*\/|\s*n\s*=\s*\\?frac\{\\?sin/i,
    conceptKeywords: ['refraction', 'snell', 'refractive index', 'optics'],
    labId: 'refraction-snell',
    labTitle: "Refraction & Snell's Law Lab",
    actionLabel: '🧪 Open Refraction Lab',
  },
  {
    equationPattern: /1\/f\s*=\s*1\/u\s*\+\s*1\/v/i,
    conceptKeywords: ['convex lens', 'focal length', 'lens equation'],
    labId: 'convex-lens',
    labTitle: 'Convex Lens Optics Lab',
    actionLabel: '🧪 Open Lens Lab',
  },
  {
    equationPattern: /pH\s*=\s*pK_?a/i,
    conceptKeywords: ['ph curve', 'titration curve', 'buffer region', 'henderson hasselbalch'],
    labId: 'ph-titration-curves',
    labTitle: 'pH Curves & Buffer Equilibrium Lab',
    actionLabel: '🧪 Open pH Curves Lab',
  },
];

export function findLabTrigger(inputLatexOrText: string): SmartboardTriggerMapping | null {
  if (!inputLatexOrText) return null;
  const cleanInput = inputLatexOrText.trim().toLowerCase();

  for (const trigger of SMARTBOARD_LAB_TRIGGERS) {
    if (typeof trigger.equationPattern === 'string') {
      if (cleanInput.includes(trigger.equationPattern.toLowerCase())) {
        return trigger;
      }
    } else if (trigger.equationPattern instanceof RegExp) {
      if (trigger.equationPattern.test(inputLatexOrText)) {
        return trigger;
      }
    }

    for (const kw of trigger.conceptKeywords) {
      if (cleanInput.includes(kw.toLowerCase())) {
        return trigger;
      }
    }
  }

  return null;
}
