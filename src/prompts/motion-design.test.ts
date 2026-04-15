import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectPersonality,
  detectEmotion,
  buildMotionDesignSection,
  buildCorePrinciplesSection,
  buildTimingEasingSection,
  buildPersonalitySection,
  buildEmotionSection,
  buildQualityRulesSection,
  buildChoreographySection,
  buildPatternRecipesSection,
} from './motion-design.js';
import type { MotionPersonality } from './motion-design.js';
import { buildSystemPrompt } from './system.js';
import { buildInteractiveSystemPrompt } from './system-interactive.js';

describe('detectPersonality', () => {
  it('detects playful from keyword', () => {
    assert.strictEqual(detectPersonality('bouncy fun animation'), 'playful');
  });

  it('detects premium from keyword', () => {
    assert.strictEqual(detectPersonality('elegant minimal reveal'), 'premium');
  });

  it('detects corporate from keyword', () => {
    assert.strictEqual(detectPersonality('clean dashboard widget'), 'corporate');
  });

  it('detects energetic from keyword', () => {
    assert.strictEqual(detectPersonality('bold explosive intro'), 'energetic');
  });

  it('returns undefined for neutral prompt', () => {
    assert.strictEqual(detectPersonality('simple circle animation'), undefined);
  });

  it('is case-insensitive', () => {
    assert.strictEqual(detectPersonality('BOUNCY BALL'), 'playful');
  });
});

describe('detectEmotion', () => {
  it('detects joy', () => {
    assert.strictEqual(detectEmotion('happy celebration'), 'joy');
  });

  it('detects calm', () => {
    assert.strictEqual(detectEmotion('calm breathing meditation'), 'calm');
  });

  it('detects urgency', () => {
    assert.strictEqual(detectEmotion('urgent alert notification'), 'urgency');
  });

  it('detects surprise', () => {
    assert.strictEqual(detectEmotion('magical reveal effect'), 'surprise');
  });

  it('returns undefined for neutral prompt', () => {
    assert.strictEqual(detectEmotion('spinning loading icon'), undefined);
  });
});

describe('section builders', () => {
  it('buildCorePrinciplesSection returns non-empty string', () => {
    const result = buildCorePrinciplesSection();
    assert.ok(result.length > 0);
    assert.ok(result.includes('PRIMARY'));
    assert.ok(result.includes('SECONDARY'));
    assert.ok(result.includes('AMBIENT'));
  });

  it('buildTimingEasingSection contains timing table and easing values', () => {
    const result = buildTimingEasingSection();
    assert.ok(result.includes('TIMING TABLE'));
    assert.ok(result.includes('DIRECTIONAL EASING'));
    assert.ok(result.includes('"o"'));
    assert.ok(result.includes('"i"'));
  });

  it('buildQualityRulesSection contains critical rules', () => {
    const result = buildQualityRulesSection();
    assert.ok(result.includes('NEVER'));
    assert.ok(result.includes('linear'));
    assert.ok(result.includes('opacity'));
  });

  it('buildChoreographySection contains stagger patterns', () => {
    const result = buildChoreographySection();
    assert.ok(result.includes('Hero'));
    assert.ok(result.includes('stagger'));
  });

  it('buildPatternRecipesSection contains common patterns', () => {
    const result = buildPatternRecipesSection();
    assert.ok(result.includes('Pulsing'));
    assert.ok(result.includes('Bounce entrance'));
    assert.ok(result.includes('Error shake'));
    assert.ok(result.includes('Spinner'));
  });
});

describe('buildPersonalitySection', () => {
  const personalities: MotionPersonality[] = ['playful', 'premium', 'corporate', 'energetic'];

  for (const p of personalities) {
    it(`${p} returns non-empty content with easing values`, () => {
      const result = buildPersonalitySection(p);
      assert.ok(result.length > 0);
      assert.ok(result.includes('"o"'), `${p} missing out-tangent`);
      assert.ok(result.includes('"i"'), `${p} missing in-tangent`);
    });
  }

  it('each personality has distinct easing values', () => {
    const outputs = personalities.map((p) => buildPersonalitySection(p));
    for (let i = 0; i < outputs.length; i++) {
      for (let j = i + 1; j < outputs.length; j++) {
        assert.notStrictEqual(outputs[i], outputs[j], `${personalities[i]} and ${personalities[j]} have identical content`);
      }
    }
  });
});

describe('buildEmotionSection', () => {
  it('returns content for joy', () => {
    const result = buildEmotionSection('joy');
    assert.ok(result.includes('Joy'));
    assert.ok(result.includes('bouncy'));
  });

  it('returns content for calm', () => {
    const result = buildEmotionSection('calm');
    assert.ok(result.includes('Calm'));
  });
});

describe('buildMotionDesignSection', () => {
  it('without options includes core sections', () => {
    const result = buildMotionDesignSection();
    assert.ok(result.includes('MOTION DESIGN PRINCIPLES'));
    assert.ok(result.includes('TIMING TABLE'));
    assert.ok(result.includes('QUALITY RULES'));
    assert.ok(result.includes('CHOREOGRAPHY'));
    assert.ok(result.includes('COMMON PATTERNS'));
  });

  it('without options does NOT include personality or emotion', () => {
    const result = buildMotionDesignSection();
    assert.ok(!result.includes('MOTION PERSONALITY:'));
    assert.ok(!result.includes('EMOTION TARGET:'));
  });

  it('with personality includes personality section', () => {
    const result = buildMotionDesignSection({ personality: 'playful' });
    assert.ok(result.includes('MOTION PERSONALITY: PLAYFUL'));
  });

  it('with emotion includes emotion section', () => {
    const result = buildMotionDesignSection({ emotion: 'joy' });
    assert.ok(result.includes('EMOTION TARGET:'));
    assert.ok(result.includes('Joy'));
  });

  it('with both personality and emotion includes both', () => {
    const result = buildMotionDesignSection({ personality: 'energetic', emotion: 'surprise' });
    assert.ok(result.includes('MOTION PERSONALITY: ENERGETIC'));
    assert.ok(result.includes('EMOTION TARGET:'));
    assert.ok(result.includes('Surprise'));
  });

  it('total output under 12,000 characters without personality/emotion', () => {
    const result = buildMotionDesignSection();
    assert.ok(result.length < 12_000, `Output too large: ${result.length} chars`);
  });

  it('total output under 15,000 characters with personality and emotion', () => {
    const result = buildMotionDesignSection({ personality: 'playful', emotion: 'joy' });
    assert.ok(result.length < 15_000, `Output too large: ${result.length} chars`);
  });
});

describe('buildSystemPrompt with motion design', () => {
  it('without motionOptions still contains structural rules and format reference', () => {
    const result = buildSystemPrompt();
    assert.ok(result.includes('DESIGN RULES'));
    assert.ok(result.includes('LOTTIE FORMAT REFERENCE'));
    assert.ok(result.includes('MOTION DESIGN PRINCIPLES'));
  });

  it('with personality includes personality section', () => {
    const result = buildSystemPrompt(undefined, { personality: 'playful' });
    assert.ok(result.includes('MOTION PERSONALITY: PLAYFUL'));
  });

  it('total system prompt under 25,000 characters with personality and emotion', () => {
    const result = buildSystemPrompt(undefined, { personality: 'playful', emotion: 'joy' });
    assert.ok(result.length < 25_000, `System prompt too large: ${result.length} chars`);
  });
});

describe('buildInteractiveSystemPrompt with motion design', () => {
  it('without motionOptions still contains state machine spec', () => {
    const result = buildInteractiveSystemPrompt();
    assert.ok(result.includes('DOTLOTTIE STATE MACHINE FORMAT'));
    assert.ok(result.includes('MOTION DESIGN PRINCIPLES'));
  });

  it('with personality includes personality section', () => {
    const result = buildInteractiveSystemPrompt(undefined, { personality: 'premium' });
    assert.ok(result.includes('MOTION PERSONALITY: PREMIUM'));
  });
});
