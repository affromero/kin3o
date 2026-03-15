export interface StateMachineValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validateStateMachine(
  sm: unknown,
  animationIds: string[],
): StateMachineValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObject(sm)) {
    return { valid: false, errors: ['State machine is not an object'], warnings };
  }

  // Validate initial
  if (typeof sm['initial'] !== 'string') {
    errors.push('Missing or invalid "initial" (must be string)');
  }

  // Validate states
  if (!Array.isArray(sm['states'])) {
    errors.push('Missing or invalid "states" (must be array)');
    return { valid: errors.length === 0, errors, warnings };
  }

  const states = sm['states'] as unknown[];
  const stateNames = new Set<string>();

  for (let i = 0; i < states.length; i++) {
    const state = states[i];
    if (!isObject(state)) {
      errors.push(`states[${i}] is not an object`);
      continue;
    }

    if (typeof state['name'] !== 'string') {
      errors.push(`states[${i}] missing "name" (must be string)`);
      continue;
    }

    const name = state['name'] as string;
    stateNames.add(name);

    const type = state['type'];
    if (type !== 'PlaybackState' && type !== 'GlobalState') {
      errors.push(`states[${i}] ("${name}") has invalid "type": "${String(type)}" (must be "PlaybackState" or "GlobalState")`);
    }

    // PlaybackState must reference a valid animation
    if (type === 'PlaybackState' && typeof state['animation'] === 'string') {
      if (!animationIds.includes(state['animation'] as string)) {
        errors.push(`states[${i}] ("${name}") references unknown animation "${state['animation']}"`);
      }
    }
  }

  // Validate initial references existing state
  if (typeof sm['initial'] === 'string' && !stateNames.has(sm['initial'] as string)) {
    errors.push(`"initial" references non-existent state "${sm['initial']}"`);
  }

  // Collect declared inputs
  const declaredInputs = new Set<string>();
  if (Array.isArray(sm['inputs'])) {
    for (const input of sm['inputs'] as unknown[]) {
      if (isObject(input) && typeof input['name'] === 'string') {
        declaredInputs.add(input['name'] as string);
      }
    }
  }

  // Validate transitions on states + collect referenced inputs
  const referencedInputs = new Set<string>();
  const transitionTargets = new Set<string>();
  const statesWithTransitions = new Set<string>();

  for (let i = 0; i < states.length; i++) {
    const state = states[i];
    if (!isObject(state)) continue;
    const name = (state['name'] as string) ?? `states[${i}]`;

    const transitions = state['transitions'];
    if (Array.isArray(transitions)) {
      if (transitions.length > 0) statesWithTransitions.add(name);

      for (let j = 0; j < transitions.length; j++) {
        const t = transitions[j];
        if (!isObject(t)) continue;

        if (typeof t['toState'] === 'string') {
          const target = t['toState'] as string;
          transitionTargets.add(target);
          if (!stateNames.has(target)) {
            errors.push(`states[${i}] ("${name}") transition[${j}] references non-existent toState "${target}"`);
          }
        }

        // Check guards
        const guards = t['guards'];
        if (Array.isArray(guards)) {
          for (const guard of guards as unknown[]) {
            if (isObject(guard) && typeof guard['inputName'] === 'string') {
              const inputName = guard['inputName'] as string;
              referencedInputs.add(inputName);
              if (!declaredInputs.has(inputName)) {
                errors.push(`states[${i}] ("${name}") guard references undeclared input "${inputName}"`);
              }
            }
          }
        }
      }
    }
  }

  // Validate interactions
  if (Array.isArray(sm['interactions'])) {
    for (let i = 0; i < (sm['interactions'] as unknown[]).length; i++) {
      const interaction = (sm['interactions'] as unknown[])[i];
      if (!isObject(interaction)) continue;

      // Check action inputName references
      const actions = interaction['actions'];
      if (Array.isArray(actions)) {
        for (const action of actions as unknown[]) {
          if (isObject(action) && typeof action['inputName'] === 'string') {
            const inputName = action['inputName'] as string;
            referencedInputs.add(inputName);
            if (!declaredInputs.has(inputName)) {
              errors.push(`interactions[${i}] action references undeclared input "${inputName}"`);
            }
          }
        }
      }

      // OnComplete/OnLoopComplete stateName references
      const type = interaction['type'];
      if ((type === 'OnComplete' || type === 'OnLoopComplete') && typeof interaction['stateName'] === 'string') {
        const stateName = interaction['stateName'] as string;
        if (!stateNames.has(stateName)) {
          errors.push(`interactions[${i}] ("${String(type)}") references non-existent stateName "${stateName}"`);
        }
      }
    }
  }

  // Warnings: unreachable states (BFS from initial)
  if (typeof sm['initial'] === 'string' && stateNames.has(sm['initial'] as string)) {
    const reachable = new Set<string>();
    const queue = [sm['initial'] as string];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);

      // Find transitions from this state
      const stateObj = states.find(
        s => isObject(s) && (s as Record<string, unknown>)['name'] === current,
      ) as Record<string, unknown> | undefined;

      if (stateObj && Array.isArray(stateObj['transitions'])) {
        for (const t of stateObj['transitions'] as unknown[]) {
          if (isObject(t) && typeof t['toState'] === 'string') {
            queue.push(t['toState'] as string);
          }
        }
      }
    }

    for (const name of stateNames) {
      if (!reachable.has(name)) {
        warnings.push(`State "${name}" is unreachable from initial state`);
      }
    }
  }

  // Warnings: dead-end states (non-final states with zero transitions)
  for (const state of states) {
    if (!isObject(state)) continue;
    const name = state['name'] as string;
    if (!name) continue;

    const transitions = state['transitions'];
    const hasTransitions = Array.isArray(transitions) && transitions.length > 0;

    // A state is a dead end if it has no transitions and other states transition TO it
    // (i.e., it's not the only state)
    if (!hasTransitions && stateNames.size > 1 && transitionTargets.has(name)) {
      // This is a valid terminal state, not necessarily a warning
      // Only warn if it's NOT the only state reached as a target and it's not a natural end
    }

    // Simpler: warn about non-final states with no outgoing transitions
    // (states that are not leaves in the graph)
    if (!hasTransitions && stateNames.size > 1) {
      // Check if this is the initial state with no transitions — that's a real dead end
      if (sm['initial'] === name) {
        warnings.push(`Initial state "${name}" has no transitions (dead end)`);
      }
    }
  }

  // Warnings: declared inputs never referenced
  for (const inputName of declaredInputs) {
    if (!referencedInputs.has(inputName)) {
      warnings.push(`Input "${inputName}" is declared but never referenced in guards or interactions`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
