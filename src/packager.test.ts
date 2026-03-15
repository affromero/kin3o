import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { packageDotLottie, writeDotLottie, readDotLottie } from './packager.js';
import { PULSING_CIRCLE } from './prompts/examples.js';
import { INTERACTIVE_BUTTON } from './prompts/examples-interactive.js';
import { validateLottie } from './validator.js';
import { validateStateMachine } from './state-machine-validator.js';

const tmpPath = (name: string) => join(tmpdir(), `kin3o-test-${name}-${Date.now()}.lottie`);

describe('packageDotLottie', () => {
  it('produces a valid ZIP buffer', async () => {
    const buffer = await packageDotLottie({
      animations: [{ id: 'pulse', data: PULSING_CIRCLE }],
    });

    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 0);
    // ZIP magic number: PK (0x50 0x4B)
    assert.strictEqual(buffer[0], 0x50);
    assert.strictEqual(buffer[1], 0x4B);
  });

  it('roundtrips a single animation', async () => {
    const outPath = tmpPath('single');
    try {
      await writeDotLottie(outPath, {
        animations: [{ id: 'pulse', data: PULSING_CIRCLE }],
      });

      assert.ok(existsSync(outPath));

      const result = await readDotLottie(outPath);
      assert.ok('pulse' in result.animations);
      const anim = result.animations['pulse'] as Record<string, unknown>;
      assert.strictEqual(anim['fr'], 60);
      assert.strictEqual(anim['w'], 512);
      assert.strictEqual(result.stateMachine, undefined);
    } finally {
      if (existsSync(outPath)) unlinkSync(outPath);
    }
  });

  it('roundtrips multiple animations with state machine', async () => {
    const outPath = tmpPath('multi');
    const stateMachine = {
      initial: 'idle',
      states: [
        { name: 'idle', type: 'PlaybackState', animation: 'pulse' },
        { name: 'active', type: 'PlaybackState', animation: 'pulse2' },
      ],
      interactions: [],
      inputs: [],
    };

    try {
      await writeDotLottie(outPath, {
        animations: [
          { id: 'pulse', data: PULSING_CIRCLE },
          { id: 'pulse2', data: { ...PULSING_CIRCLE, fr: 30 } },
        ],
        stateMachine: { id: 'sm', data: stateMachine },
      });

      const result = await readDotLottie(outPath);
      assert.ok('pulse' in result.animations);
      assert.ok('pulse2' in result.animations);
      assert.ok(result.stateMachine !== undefined);
      const sm = result.stateMachine as Record<string, unknown>;
      assert.strictEqual(sm['initial'], 'idle');
    } finally {
      if (existsSync(outPath)) unlinkSync(outPath);
    }
  });

  it('packages interactive button example end-to-end', async () => {
    const outPath = tmpPath('interactive-button');

    // Verify the example animations are valid Lottie
    const animIds = Object.keys(INTERACTIVE_BUTTON.animations);
    for (const id of animIds) {
      const anim = INTERACTIVE_BUTTON.animations[id as keyof typeof INTERACTIVE_BUTTON.animations];
      const result = validateLottie(anim);
      assert.strictEqual(result.valid, true, `Animation "${id}" invalid: ${result.errors.join(', ')}`);
    }

    // Verify the state machine is valid
    const smResult = validateStateMachine(INTERACTIVE_BUTTON.stateMachine, animIds);
    assert.strictEqual(smResult.valid, true, `State machine invalid: ${smResult.errors.join(', ')}`);

    try {
      // Package
      await writeDotLottie(outPath, {
        animations: animIds.map(id => ({
          id,
          data: INTERACTIVE_BUTTON.animations[id as keyof typeof INTERACTIVE_BUTTON.animations],
        })),
        stateMachine: { id: 'button-sm', data: INTERACTIVE_BUTTON.stateMachine },
      });

      // Roundtrip
      const result = await readDotLottie(outPath);
      assert.strictEqual(Object.keys(result.animations).length, 3);
      assert.ok('idle' in result.animations);
      assert.ok('hover' in result.animations);
      assert.ok('pressed' in result.animations);
      assert.ok(result.stateMachine !== undefined);
    } finally {
      if (existsSync(outPath)) unlinkSync(outPath);
    }
  });
});
