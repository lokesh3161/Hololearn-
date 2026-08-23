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
import { TorqueRotationalEquilibriumLab } from './experiments/TorqueRotationalEquilibriumLab';
import { CentripetalLab } from './experiments/CentripetalLab';
import { ConvexLensLab } from './experiments/ConvexLensLab';
import { WaterHardnessEdtaLab } from './experiments/WaterHardnessEdtaLab';
import { WinklerDissolvedOxygenLab } from './experiments/WinklerDissolvedOxygenLab';
import { LeadAcidStrengthLab } from './experiments/LeadAcidStrengthLab';
import { FerrousIronDichromateLab } from './experiments/FerrousIronDichromateLab';
import { PHWaterSoilLab } from './experiments/PHWaterSoilLab';
import { PhenolFormaldehydeLab } from './experiments/PhenolFormaldehydeLab';
import { NewtonsRingsLab } from './experiments/NewtonsRingsLab';
import { CareyFosterBridgeLab } from './experiments/CareyFosterBridgeLab';
import { DielectricConstantLab } from './experiments/DielectricConstantLab';
import { TorsionalPendulumLab } from './experiments/TorsionalPendulumLab';
import { DiffractionGratingLab } from './experiments/DiffractionGratingLab';
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
  // Experiment 11: Determination of Laser Wavelength by Diffraction Grating
  'diffraction-grating-laser': DiffractionGratingLab,
  'laser-wavelength-diffraction': DiffractionGratingLab,
  'diffraction-grating': DiffractionGratingLab,
  'laser-diffraction': DiffractionGratingLab,

  // Experiment 10: Determination of Rigidity Modulus Using Torsional Pendulum
  'torsional-pendulum-rigidity': TorsionalPendulumLab,
  'torsional-pendulum': TorsionalPendulumLab,
  'rigidity-modulus': TorsionalPendulumLab,
  'shear-modulus-wire': TorsionalPendulumLab,

  // Experiment 09: Determination of Dielectric Constant Using Charging & Discharging
  'dielectric-constant-rc': DielectricConstantLab,
  'dielectric-constant': DielectricConstantLab,
  'rc-charging-discharging': DielectricConstantLab,
  'dielectric-permittivity': DielectricConstantLab,

  // Experiment 08: Verification of Series & Parallel Resistance Laws by Carey Foster Bridge
  'carey-foster-bridge': CareyFosterBridgeLab,
  'carey-foster': CareyFosterBridgeLab,
  'series-parallel-resistances': CareyFosterBridgeLab,
  'resistance-combination-bridge': CareyFosterBridgeLab,

  // Experiment 07: Determination of Radius of Curvature by Newton's Rings
  // Experiment 07: Determination of Radius of Curvature by Newton's Rings
  'newtons-rings': NewtonsRingsLab,
  'newtons-rings-radius': NewtonsRingsLab,
  'newtons-rings-plano-convex': NewtonsRingsLab,
  'radius-of-curvature-lens': NewtonsRingsLab,

  // Experiment 06: Preparation of Phenol-Formaldehyde Polymer
  'phenol-formaldehyde-polymer': PhenolFormaldehydeLab,
  'phenol-formaldehyde': PhenolFormaldehydeLab,
  'bakelite-lab': PhenolFormaldehydeLab,
  'polymerization-lab': PhenolFormaldehydeLab,

  // Experiment 05: pH of Water and Soil Samples
  'ph-water-soil': PHWaterSoilLab,
  'ph-water-soil-samples': PHWaterSoilLab,
  'water-soil-ph': PHWaterSoilLab,
  'ph-meter-calibration': PHWaterSoilLab,

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
  'conservation-of-mechanical-energy': EnergyLab,
  'mechanical-energy': EnergyLab,
  'energy-lab': EnergyLab,
  'torque-equilibrium': TorqueRotationalEquilibriumLab,
  'torque-rotational-equilibrium': TorqueRotationalEquilibriumLab,
  'rotational-equilibrium': TorqueRotationalEquilibriumLab,
  'torque-lab': TorqueRotationalEquilibriumLab,
  'torque': TorqueRotationalEquilibriumLab,
  'centripetal-force': CentripetalLab,
  'centripetal': CentripetalLab,
  'hookes-law': HookesLawLab,
  'simple-pendulum': SimplePendulumLab,
  'pendulum-lab': SimplePendulumLab,
  'free-fall': FreeFallLab,
  'free-fall-motion': FreeFallLab,
  'gravitational-acceleration': FreeFallLab,
  'ohms-law': OhmsLawLab,
  'specific-heat': SpecificHeatLab,

  // Chemistry Labs
  'ferrous-iron-dichromate': FerrousIronDichromateLab,
  'ferrous-dichromate': FerrousIronDichromateLab,
  'iron-dichromate-titration': FerrousIronDichromateLab,
  'lead-acid-strength': LeadAcidStrengthLab,
  'battery-acid-strength': LeadAcidStrengthLab,
  'lead-acid-battery': LeadAcidStrengthLab,
  'dissolved-oxygen-winkler': WinklerDissolvedOxygenLab,
  'dissolved-oxygen': WinklerDissolvedOxygenLab,
  'winkler-method': WinklerDissolvedOxygenLab,
  'water-hardness-edta': WaterHardnessEdtaLab,
  'water-hardness': WaterHardnessEdtaLab,
  'edta-titration': WaterHardnessEdtaLab,
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

