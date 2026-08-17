import React from 'react';
import type { ExperimentConfig } from '../types';
import { VirtualLabShell } from '../../components/virtual-lab/VirtualLabShell';
import { AcidBaseTitrationLab } from './experiments/AcidBaseTitrationLab';
import { OhmsLawLab } from './experiments/OhmsLawLab';
import { HookesLawLab } from './experiments/HookesLawLab';
import { SimplePendulumLab } from './experiments/SimplePendulumLab';
import { FreeFallLab } from './experiments/FreeFallLab';
import { SpecificHeatLab } from './experiments/SpecificHeatLab';
import { CalorimetryLab } from './experiments/CalorimetryLab';
import { ReactionRatesLab } from './experiments/ReactionRatesLab';
import { ElectrolysisLab } from './experiments/ElectrolysisLab';
import { PHCurvesLab } from './experiments/PHCurvesLab';
import { NewtonsLawLab } from './experiments/NewtonsLawLab';
import { FrictionLab } from './experiments/FrictionLab';
import { ProjectileLab } from './experiments/ProjectileLab';
import { MomentumLab } from './experiments/MomentumLab';
import { EnergyLab } from './experiments/EnergyLab';
import { TorqueLab } from './experiments/TorqueLab';
import { CentripetalLab } from './experiments/CentripetalLab';
import { ConvexLensLab } from './experiments/ConvexLensLab';
import { ComingSoonLab } from './experiments/ComingSoonLab';

export interface ExperimentRendererProps {
  config: ExperimentConfig;
  inputs: Record<string, any>;
  onUpdateInput: (key: string, val: any) => void;
  onRecordDataPoint: () => void;
  onCompleteStep: (stepIndex: number) => void;
  onBack: () => void;
}

const experimentRendererRegistry: Record<string, React.ComponentType<any>> = {
  // 10 Physics Mechanics Labs
  'newtons-second-law': NewtonsLawLab,
  'newtons-law': NewtonsLawLab,
  'friction-lab': FrictionLab,
  'friction': FrictionLab,
  'projectile-motion': ProjectileLab,
  'projectile': ProjectileLab,
  'momentum-conservation': MomentumLab,
  'momentum-collisions': MomentumLab,
  'convex-lens': ConvexLensLab,
  'convex-lens-focal': ConvexLensLab,
  'refraction-snell': ConvexLensLab,
  'conservation-of-energy': EnergyLab,
  'energy-conservation': EnergyLab,
  'torque-equilibrium': TorqueLab,
  'torque': TorqueLab,
  'centripetal-force': CentripetalLab,
  'centripetal': CentripetalLab,
  'hookes-law': HookesLawLab,
  'simple-pendulum': SimplePendulumLab,
  'pendulum-lab': SimplePendulumLab,
  'free-fall': FreeFallLab,
  'ohms-law': OhmsLawLab,
  'specific-heat': SpecificHeatLab,

  // Chemistry Labs
  'acid-base-titration': AcidBaseTitrationLab,
  'reaction-rates': ReactionRatesLab,
  'calorimetry': CalorimetryLab,
  'enthalpy-calorimetry': CalorimetryLab,
  'electrolysis': ElectrolysisLab,
  'copper-electrolysis': ElectrolysisLab,
  'ph-curves': PHCurvesLab,
  'ph-titration-curves': PHCurvesLab,
};

export function resolveRenderer(id: string) {
  const Component = experimentRendererRegistry[id] ?? ComingSoonLab;
  return Component;
}

export const ExperimentRendererRegistry: React.FC<ExperimentRendererProps> = (props) => {
  const { config, onBack } = props;
  const Component = resolveRenderer(config.id);

  if (Component === ComingSoonLab) {
    return <ComingSoonLab config={config} onBack={onBack} />;
  }

  return (
    <VirtualLabShell experimentId={config.id} title={config.title}>
      <Component {...props} />
    </VirtualLabShell>
  );
};

