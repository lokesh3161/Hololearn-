/**
 * Experiment 06 Configuration: Preparation of Phenol-Formaldehyde Polymer
 * HoloLearn Virtual Laboratory
 */

import type { ExperimentConfig } from '../types';
import { DEFAULT_PHENOL_FORMALDEHYDE_CONFIG } from '../engines/PolymerizationEngine';

export const phenolFormaldehydeConfig: ExperimentConfig = {
  id: 'phenol-formaldehyde-polymer',
  title: 'Preparation of Phenol-Formaldehyde Polymer',
  subject: 'chemistry',
  objective: 'Investigate the condensation polymerization of phenol and formaldehyde into resol or novolac polymer resins, observing viscosity changes, gelation, and crosslinking.',
  apparatus: [
    {
      id: 'reaction-vessel',
      name: '250 mL Three-Neck Reaction Flask with Heating Mantle',
      specs: 'Borosilicate glass flask with integrated thermal heating control & mechanical stirrer',
      instructions: 'Contains the reaction mixture; monitor temperature and stirring speed during polymerization.',
    },
    {
      id: 'reagent-phenol',
      name: 'Virtual Phenol Storage Bottle',
      specs: 'Simulated Monomeric Phenol (C6H5OH)',
      instructions: 'Transfer simulated phenol reagent to measuring cylinder.',
    },
    {
      id: 'reagent-formaldehyde',
      name: 'Virtual Formaldehyde Solution Bottle',
      specs: 'Simulated Formaldehyde (CH2O aq)',
      instructions: 'Transfer simulated formaldehyde solution to measuring cylinder.',
    },
    {
      id: 'measuring-cylinder',
      name: '50 mL Precision Graduated Cylinder',
      specs: '0.5 mL graduations',
      instructions: 'Measure required virtual quantities before transferring to reaction flask.',
    },
    {
      id: 'ppe-station',
      name: 'Virtual Laboratory Safety & PPE Station',
      specs: 'Safety Goggles, Lab Coat, Nitrile Gloves',
      instructions: 'Acknowledge safety guidelines and select virtual PPE before handling simulated reagents.',
    },
  ],
  substances: [
    {
      id: 'phenol',
      name: 'Phenol',
      formula: 'C6H5OH',
      initialTemp: 25.0,
      initialColor: 'rgba(255, 255, 255, 0.8)',
    },
    {
      id: 'formaldehyde',
      name: 'Formaldehyde Solution',
      formula: 'CH2O(aq)',
      initialTemp: 25.0,
      initialColor: 'rgba(240, 248, 255, 0.7)',
    },
    {
      id: 'catalyst-base',
      name: 'Base Catalyst (Sodium Hydroxide / Ammonia)',
      formula: 'NaOH / NH3',
      initialTemp: 25.0,
    },
    {
      id: 'catalyst-acid',
      name: 'Acid Catalyst (Hydrochloric Acid / Oxalic Acid)',
      formula: 'HCl / (COOH)2',
      initialTemp: 25.0,
    },
  ],
  procedure: [
    {
      stepNumber: 1,
      instruction: 'Review virtual laboratory safety warning and select virtual PPE (goggles, coat, gloves).',
      expectedAction: 'Safety panel acknowledged and PPE equipped.',
    },
    {
      stepNumber: 2,
      instruction: 'Select polymer synthesis pathway (Resol - Base catalyzed OR Novolac - Acid catalyzed).',
      expectedAction: 'Pathway configuration active.',
    },
    {
      stepNumber: 3,
      instruction: 'Measure virtual Phenol reagent in graduated cylinder and transfer to reaction flask.',
      expectedAction: 'Phenol transferred to reaction vessel.',
    },
    {
      stepNumber: 4,
      instruction: 'Measure virtual Formaldehyde solution in graduated cylinder and transfer to reaction flask.',
      expectedAction: 'Formaldehyde transferred to reaction vessel.',
    },
    {
      stepNumber: 5,
      instruction: 'Add the required catalyst condition (Base for Resol / Acid for Novolac).',
      expectedAction: 'Catalyst condition established.',
    },
    {
      stepNumber: 6,
      instruction: 'Initiate mechanical stirring to homogenize the reaction mixture.',
      expectedAction: 'Mixture fully homogenized (mixing progress = 100%).',
    },
    {
      stepNumber: 7,
      instruction: 'Activate heating mantle to raise mixture temperature to 90.0 °C.',
      expectedAction: 'Thermal state reaches target reaction window (>= 60.0 °C).',
    },
    {
      stepNumber: 8,
      instruction: 'Monitor condensation polymerization progress, observing oligomer formation and viscosity increase.',
      expectedAction: 'Reaction progress advances towards gelation.',
    },
    {
      stepNumber: 9,
      instruction: 'Allow curing step under elevated temperature to crosslink the polymer network into a solid resin.',
      expectedAction: 'Curing completed; polymer state reaches CURED.',
    },
    {
      stepNumber: 10,
      instruction: 'Inspect the final polymer resin sample in the inspection tray and generate the scientific laboratory report.',
      expectedAction: 'Polymer sample inspected and report completed.',
    },
  ],
  stateEngine: {
    constants: {
      targetTemp: DEFAULT_PHENOL_FORMALDEHYDE_CONFIG.educationalParameters.reactionProgressRate,
    },
    calculateState: (inputs: Record<string, any>) => {
      const pathway = inputs.pathway || 'resol';
      const progress = Number(inputs.reactionProgress || 0);
      const viscosity = Number(inputs.viscosity || 1.5);
      const polymerFraction = Number(inputs.polymerFraction || 0);
      const crosslinkDensity = Number(inputs.crosslinkDensity || 0);
      const tempC = Number(inputs.tempC || 25.0);

      return {
        pathway,
        progress,
        viscosity,
        polymerFraction,
        crosslinkDensity,
        tempC,
        isCured: progress >= 90 || inputs.curingProgress >= 90,
      };
    },
  },
  dataTable: {
    columns: [
      { key: 'timeMin', label: 'Time', unit: 'min', precision: 1 },
      { key: 'tempC', label: 'Temp', unit: '°C', precision: 1 },
      { key: 'progress', label: 'Reaction', unit: '%', precision: 1 },
      { key: 'polymerFrac', label: 'Polymer Frac', unit: '', precision: 2 },
      { key: 'viscosity', label: 'Viscosity', unit: 'cP', precision: 0 },
      { key: 'crosslink', label: 'Crosslinking', unit: '', precision: 2 },
      { key: 'state', label: 'State', unit: '' },
    ],
    calculateRow: (inputs: Record<string, any>) => {
      return {
        timeMin: Number(inputs.timeMin || 0.0),
        tempC: Number(inputs.tempC || 25.0),
        progress: Number(inputs.reactionProgress || 0.0),
        polymerFrac: Number(inputs.polymerFraction || 0.0),
        viscosity: Number(inputs.viscosity || 1.5),
        crosslink: Number(inputs.crosslinkDensity || 0.0),
        state: inputs.stateLabel || 'Unreacted',
      };
    },
  },
  graph: {
    xAxis: { label: 'Reaction Time', unit: 'min', key: 'timeMin' },
    yAxis: { label: 'Polymer Fraction / Viscosity (cP)', unit: '', key: 'progress' },
    expectedFormula: '\\text{Phenol} + \\text{Formaldehyde} \\xrightarrow[\\Delta]{\\text{Catalyst}} \\text{Resin} + H_2O',
  },
  mistakes: [
    {
      id: 'unmixed-reaction',
      name: 'Heating Unmixed Reagents',
      triggerCondition: 'inputs.isMixed === false',
      consequence: 'Heterogeneous reaction rate causes localized overheating without polymerization.',
      aiExplanation: 'Always homogenize the phenol-formaldehyde reagent mixture with stirring before activating heating.',
    },
    {
      id: 'missing-catalyst',
      name: 'Missing Reaction Catalyst',
      triggerCondition: 'inputs.catalystAdded === false',
      consequence: 'Uncatalyzed condensation rate is extremely slow.',
      aiExplanation: 'Condensation polymerization of phenol and formaldehyde requires an acid or base catalyst condition.',
    },
    {
      id: 'insufficient-heating',
      name: 'Insufficient Temperature',
      triggerCondition: 'inputs.tempC < 55.0',
      consequence: 'Thermal activation energy is not reached; reaction remains dormant.',
      aiExplanation: 'Activate the heating mantle to reach the 85 - 95 °C reaction window for effective polymerization.',
    },
  ],
  assessment: [
    {
      id: 'p1',
      description: 'Acknowledged safety guidelines and selected virtual PPE',
      points: 10,
      verifyCondition: 'inputs.ppeSelected === true',
    },
    {
      id: 'p2',
      description: 'Selected polymer pathway (Resol or Novolac) and measured reagents',
      points: 15,
      verifyCondition: 'inputs.reagentsMeasured === true',
    },
    {
      id: 'p3',
      description: 'Established required catalyst condition and homogenized mixture',
      points: 15,
      verifyCondition: 'inputs.isMixed === true',
    },
    {
      id: 'p4',
      description: 'Activated heating mantle and reached reaction temperature (>= 60 °C)',
      points: 20,
      verifyCondition: 'inputs.tempC >= 60.0',
    },
    {
      id: 'p5',
      description: 'Monitored polymerization progress, observing viscosity increase and gelation',
      points: 20,
      verifyCondition: 'inputs.reactionProgress >= 70',
    },
    {
      id: 'p6',
      description: 'Completed thermal curing and inspected final thermoset resin sample',
      points: 20,
      verifyCondition: 'inputs.isCured === true',
    },
  ],
  freeMode: {
    objective: 'Explore polymer formation across varied thermal heating profiles and compare Resol vs Novolac resin crosslinking.',
    availableApparatus: ['Reaction Flask', 'Heating Mantle', 'Stirrer', 'Phenol Bottle', 'Formaldehyde Bottle', 'Catalyst Bottles'],
    aiGuidanceStyle: 'safety_and_hints_only',
  },
  researchMode: {
    scientificQuestion: 'Investigate the dependence of gelation time on catalyst concentration and reaction temperature in Resol synthesis.',
    constraints: { timeMinutes: 30, budget: 100, safetyLevel: 'Low' },
    requiredIdentifications: ['Independent: Heating temperature & catalyst concentration', 'Dependent: Gelation time & viscosity slope'],
  },
  smartboardTrigger: {
    detectedLaTeX: [
      '\\text{Phenol} + \\text{Formaldehyde} \\rightarrow \\text{Resin} + H_2O',
      'n\\text{C}_6\\text{H}_5\\text{OH} + n\\text{CH}_2\\text{O} \\rightarrow \\text{Polymer}',
    ],
    conceptKeywords: ['condensation polymerization', 'phenol', 'formaldehyde', 'resol', 'novolac', 'resin', 'crosslinking', 'viscosity', 'curing'],
  },
};
