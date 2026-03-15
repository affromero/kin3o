import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PULSING_CIRCLE, WAVEFORM_BARS } from './examples.js';
import { INTERACTIVE_BUTTON } from './examples-interactive.js';
import { MASCOT_STATIC, MASCOT_INTERACTIVE } from './examples-mascot.js';
import { validateLottie } from '../validator.js';
import { validateStateMachine } from '../state-machine-validator.js';

describe('static example animations', () => {
  for (const [name, anim] of Object.entries({ PULSING_CIRCLE, WAVEFORM_BARS, MASCOT_STATIC })) {
    it(`${name} passes Lottie validation`, () => {
      const result = validateLottie(anim);
      assert.strictEqual(result.valid, true, `${name} invalid: ${result.errors.join(', ')}`);
      assert.strictEqual(result.warnings.length, 0, `${name} warnings: ${result.warnings.join(', ')}`);
    });
  }
});

describe('interactive example: INTERACTIVE_BUTTON', () => {
  const animIds = Object.keys(INTERACTIVE_BUTTON.animations);

  it('has at least 2 animations', () => {
    assert.ok(animIds.length >= 2, `Expected >=2 animations, got ${animIds.length}`);
  });

  for (const id of animIds) {
    it(`animation "${id}" passes Lottie validation`, () => {
      const anim = INTERACTIVE_BUTTON.animations[id as keyof typeof INTERACTIVE_BUTTON.animations];
      const result = validateLottie(anim);
      assert.strictEqual(result.valid, true, `"${id}" invalid: ${result.errors.join(', ')}`);
    });
  }

  it('state machine passes validation', () => {
    const result = validateStateMachine(INTERACTIVE_BUTTON.stateMachine, animIds);
    assert.strictEqual(result.valid, true, `SM invalid: ${result.errors.join(', ')}`);
  });
});

describe('interactive example: MASCOT_INTERACTIVE', () => {
  const animIds = Object.keys(MASCOT_INTERACTIVE.animations);

  it('has at least 2 animations', () => {
    assert.ok(animIds.length >= 2, `Expected >=2 animations, got ${animIds.length}`);
  });

  for (const id of animIds) {
    it(`animation "${id}" passes Lottie validation`, () => {
      const anim = MASCOT_INTERACTIVE.animations[id as keyof typeof MASCOT_INTERACTIVE.animations];
      const result = validateLottie(anim);
      assert.strictEqual(result.valid, true, `"${id}" invalid: ${result.errors.join(', ')}`);
    });
  }

  it('state machine passes validation', () => {
    const result = validateStateMachine(MASCOT_INTERACTIVE.stateMachine, animIds);
    assert.strictEqual(result.valid, true, `SM invalid: ${result.errors.join(', ')}`);
  });
});
