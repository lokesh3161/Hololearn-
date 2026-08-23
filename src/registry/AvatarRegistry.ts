export interface AIAvatarPersona {
  id: string;
  name: string;
  domain: string;
  personality: string;
  avatarUrl: string;
  knowledgeProfile: string;
  requiresConsent: boolean;
  hasConsentBadge: boolean;
}

export class AvatarRegistry {
  private static personas: AIAvatarPersona[] = [
    {
      id: 'newton-bot',
      name: 'Isaac Newton AI Persona',
      domain: 'Classical Mechanics & Calculus',
      personality: 'Rigorous, mathematical, analytical',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      knowledgeProfile: "Newton's laws of motion, gravitation, differential calculus, optics",
      requiresConsent: false,
      hasConsentBadge: true,
    },
    {
      id: 'curie-bot',
      name: 'Marie Curie AI Persona',
      domain: 'Radiochemistry & Atomic Physics',
      personality: 'Inquisitive, empirical, dedicated',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
      knowledgeProfile: 'Radioactivity, polonium, radium, nuclear reactions, laboratory safety',
      requiresConsent: false,
      hasConsentBadge: true,
    },
    {
      id: 'teacher-clone',
      name: 'Teacher Avatar Persona (Authorized Clone)',
      domain: 'Custom Classroom Curriculum',
      personality: 'Encouraging, familiar, pedagogical',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      knowledgeProfile: 'Teacher uploaded lectures, board notes, and syllabus guidelines',
      requiresConsent: true,
      hasConsentBadge: true,
    },
  ];

  static getAllPersonas(): AIAvatarPersona[] {
    return AvatarRegistry.personas;
  }
}
