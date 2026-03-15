import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateLottie, autoFix } from './validator.js';

const pulseJson = JSON.parse(readFileSync(new URL('../examples/pulse.json', import.meta.url), 'utf-8'));
const waveformJson = JSON.parse(readFileSync(new URL('../examples/waveform.json', import.meta.url), 'utf-8'));

describe('validateLottie', () => {
  it('validates pulse example as valid', () => {
    const result = validateLottie(pulseJson);
    assert.strictEqual(result.valid, true, `Errors: ${result.errors.join(', ')}`);
    assert.strictEqual(result.errors.length, 0);
  });

  it('validates waveform example as valid', () => {
    const result = validateLottie(waveformJson);
    assert.strictEqual(result.valid, true, `Errors: ${result.errors.join(', ')}`);
    assert.strictEqual(result.errors.length, 0);
  });

  it('rejects non-object input', () => {
    const result = validateLottie('not an object');
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('not an object')));
  });

  it('reports missing required fields', () => {
    const result = validateLottie({ layers: [] });
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('"w"')));
    assert.ok(result.errors.some(e => e.includes('"h"')));
    assert.ok(result.errors.some(e => e.includes('"fr"')));
  });

  it('reports missing layers', () => {
    const result = validateLottie({ w: 512, h: 512, fr: 60, ip: 0, op: 120 });
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('layers')));
  });

  it('warns about 0-255 colors', () => {
    const json = {
      ...pulseJson,
      layers: [{
        ty: 4, ind: 0, nm: 'test', ip: 0, op: 120, st: 0, ddd: 0,
        ks: { a: { a: 0, k: [0, 0] }, p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        shapes: [{
          ty: 'gr', it: [
            { ty: 'fl', c: { a: 0, k: [217, 119, 6, 1] }, o: { a: 0, k: 100 }, r: 1 },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
        }],
        bm: 0,
      }],
    };
    const result = validateLottie(json);
    assert.ok(result.warnings.some(w => w.includes('values > 1')));
  });

  it('warns about missing version', () => {
    const json = { ...pulseJson };
    delete (json as Record<string, unknown>)['v'];
    const result = validateLottie(json);
    assert.ok(result.warnings.some(w => w.includes('version')));
  });

  it('errors on group without trailing tr', () => {
    const json = {
      ...pulseJson,
      layers: [{
        ty: 4, ind: 0, nm: 'test', ip: 0, op: 120, st: 0, ddd: 0,
        ks: { a: { a: 0, k: [0, 0] }, p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        shapes: [{
          ty: 'gr', it: [
            { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] } },
            { ty: 'fl', c: { a: 0, k: [1, 0, 0, 1] }, o: { a: 0, k: 100 }, r: 1 },
          ],
        }],
        bm: 0,
      }],
    };
    const result = validateLottie(json);
    assert.ok(result.errors.some(e => e.includes('tr')));
  });
});

describe('autoFix', () => {
  it('adds missing version string', () => {
    const json = { ...pulseJson };
    delete (json as Record<string, unknown>)['v'];
    const fixed = autoFix(json) as Record<string, unknown>;
    assert.strictEqual(fixed['v'], '5.5.2');
  });

  it('adds missing assets array', () => {
    const json = { ...pulseJson };
    delete (json as Record<string, unknown>)['assets'];
    const fixed = autoFix(json) as Record<string, unknown>;
    assert.ok(Array.isArray(fixed['assets']));
  });

  it('normalizes 0-255 colors to 0-1', () => {
    const json = {
      ...pulseJson,
      layers: [{
        ty: 4, ind: 0, nm: 'test', ip: 0, op: 120, st: 0, ddd: 0,
        ks: { a: { a: 0, k: [0, 0] }, p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        shapes: [{
          ty: 'gr', it: [
            { ty: 'fl', c: { a: 0, k: [255, 128, 0, 1] }, o: { a: 0, k: 100 }, r: 1 },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
        }],
        bm: 0,
      }],
    };
    const fixed = autoFix(json) as Record<string, unknown>;
    const layers = fixed['layers'] as Record<string, unknown>[];
    const shapes = layers[0]!['shapes'] as Record<string, unknown>[];
    const group = shapes[0]!['it'] as Record<string, unknown>[];
    const fill = group[0] as Record<string, unknown>;
    const c = fill['c'] as Record<string, unknown>;
    const k = c['k'] as number[];
    assert.ok(k[0]! <= 1, `Red should be <= 1, got ${k[0]}`);
    assert.ok(k[1]! <= 1, `Green should be <= 1, got ${k[1]}`);
    assert.ok(k[2]! <= 1, `Blue should be <= 1, got ${k[2]}`);
  });

  it('adds missing ddd to layers', () => {
    const json = {
      ...pulseJson,
      layers: [{
        ty: 4, ind: 0, nm: 'test', ip: 0, op: 120, st: 0,
        ks: { a: { a: 0, k: [0, 0] }, p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        shapes: [{ ty: 'gr', it: [{ ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }] }],
        bm: 0,
      }],
    };
    const fixed = autoFix(json) as Record<string, unknown>;
    const layers = fixed['layers'] as Record<string, unknown>[];
    assert.strictEqual(layers[0]!['ddd'], 0);
  });

  it('does not modify already valid JSON', () => {
    const original = JSON.stringify(pulseJson);
    const fixed = autoFix(pulseJson);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(fixed)), JSON.parse(original));
  });
});
