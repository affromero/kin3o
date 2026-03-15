import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateStateMachine } from './state-machine-validator.js';

const VALID_SM = {
  initial: 'idle',
  states: [
    { name: 'idle', type: 'PlaybackState', animation: 'idle_anim', transitions: [{ toState: 'hover' }] },
    { name: 'hover', type: 'PlaybackState', animation: 'hover_anim', transitions: [{ toState: 'idle' }] },
  ],
  interactions: [],
  inputs: [],
};
const ANIM_IDS = ['idle_anim', 'hover_anim'];

describe('validateStateMachine', () => {
  it('validates a correct state machine', () => {
    const result = validateStateMachine(VALID_SM, ANIM_IDS);
    assert.strictEqual(result.valid, true, `Errors: ${result.errors.join(', ')}`);
    assert.strictEqual(result.errors.length, 0);
  });

  it('rejects non-object input', () => {
    const result = validateStateMachine('not an object', []);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('not an object')));
  });

  it('rejects missing initial', () => {
    const sm = { states: [{ name: 'a', type: 'PlaybackState' }], interactions: [], inputs: [] };
    const result = validateStateMachine(sm, []);
    assert.ok(result.errors.some(e => e.includes('"initial"')));
  });

  it('rejects initial referencing non-existent state', () => {
    const sm = { initial: 'ghost', states: [{ name: 'a', type: 'PlaybackState' }], interactions: [], inputs: [] };
    const result = validateStateMachine(sm, []);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('non-existent state "ghost"')));
  });

  it('rejects missing states array', () => {
    const result = validateStateMachine({ initial: 'a' }, []);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('"states"')));
  });

  it('rejects state with invalid type', () => {
    const sm = { initial: 'a', states: [{ name: 'a', type: 'BadType' }], interactions: [], inputs: [] };
    const result = validateStateMachine(sm, []);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('invalid "type"')));
  });

  it('rejects PlaybackState referencing unknown animation', () => {
    const sm = {
      initial: 'a',
      states: [{ name: 'a', type: 'PlaybackState', animation: 'missing' }],
      interactions: [],
      inputs: [],
    };
    const result = validateStateMachine(sm, ['real']);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('unknown animation "missing"')));
  });

  it('rejects transition to non-existent state', () => {
    const sm = {
      initial: 'a',
      states: [{ name: 'a', type: 'PlaybackState', animation: 'x', transitions: [{ toState: 'ghost' }] }],
      interactions: [],
      inputs: [],
    };
    const result = validateStateMachine(sm, ['x']);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('non-existent toState "ghost"')));
  });

  it('rejects guard referencing undeclared input', () => {
    const sm = {
      initial: 'a',
      states: [{
        name: 'a', type: 'PlaybackState', animation: 'x',
        transitions: [{ toState: 'a', guards: [{ inputName: 'missing', conditionType: 'Equal', value: true }] }],
      }],
      interactions: [],
      inputs: [],
    };
    const result = validateStateMachine(sm, ['x']);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('undeclared input "missing"')));
  });

  it('rejects interaction action referencing undeclared input', () => {
    const sm = {
      initial: 'a',
      states: [{ name: 'a', type: 'PlaybackState', animation: 'x' }],
      interactions: [{ type: 'PointerDown', actions: [{ type: 'SetBoolean', inputName: 'ghost', value: true }] }],
      inputs: [],
    };
    const result = validateStateMachine(sm, ['x']);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('undeclared input "ghost"')));
  });

  it('rejects OnComplete referencing non-existent stateName', () => {
    const sm = {
      initial: 'a',
      states: [{ name: 'a', type: 'PlaybackState', animation: 'x' }],
      interactions: [{ type: 'OnComplete', stateName: 'missing' }],
      inputs: [],
    };
    const result = validateStateMachine(sm, ['x']);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('non-existent stateName "missing"')));
  });

  it('warns about unreachable states', () => {
    const sm = {
      initial: 'a',
      states: [
        { name: 'a', type: 'PlaybackState', animation: 'x', transitions: [] },
        { name: 'orphan', type: 'PlaybackState', animation: 'x', transitions: [] },
      ],
      interactions: [],
      inputs: [],
    };
    const result = validateStateMachine(sm, ['x']);
    assert.strictEqual(result.valid, true);
    assert.ok(result.warnings.some(w => w.includes('unreachable')));
  });

  it('warns about declared but unreferenced inputs', () => {
    const sm = {
      initial: 'a',
      states: [{ name: 'a', type: 'PlaybackState', animation: 'x' }],
      interactions: [],
      inputs: [{ name: 'unused', type: 'Boolean', value: false }],
    };
    const result = validateStateMachine(sm, ['x']);
    assert.strictEqual(result.valid, true);
    assert.ok(result.warnings.some(w => w.includes('never referenced')));
  });

  it('warns about initial state with no transitions (dead end)', () => {
    const sm = {
      initial: 'a',
      states: [
        { name: 'a', type: 'PlaybackState', animation: 'x' },
        { name: 'b', type: 'PlaybackState', animation: 'x', transitions: [{ toState: 'a' }] },
      ],
      interactions: [],
      inputs: [],
    };
    const result = validateStateMachine(sm, ['x']);
    assert.ok(result.warnings.some(w => w.includes('dead end')));
  });

  it('accepts GlobalState type', () => {
    const sm = {
      initial: 'global',
      states: [{ name: 'global', type: 'GlobalState' }],
      interactions: [],
      inputs: [],
    };
    const result = validateStateMachine(sm, []);
    assert.strictEqual(result.valid, true);
  });
});
