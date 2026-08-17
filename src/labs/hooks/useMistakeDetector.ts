import { useState, useEffect, useCallback } from 'react';

export interface MistakeRuleDef<S> {
  id: string;
  check: (state: S) => boolean;
  severity: 'warning' | 'error';
  title: string;
  message: string;
  educationalNote: string;
}

export function useMistakeDetector<S>(state: S, rules: MistakeRuleDef<S>[]) {
  const [activeMistakes, setActiveMistakes] = useState<string[]>([]);

  useEffect(() => {
    const triggered = rules.filter((r) => r.check(state)).map((r) => r.id);
    setActiveMistakes(triggered);
  }, [state, rules]);

  const getActiveMistakes = useCallback(
    () => rules.filter((r) => activeMistakes.includes(r.id)),
    [rules, activeMistakes]
  );

  return { activeMistakes, getActiveMistakes };
}
