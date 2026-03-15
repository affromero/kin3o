import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseResolution, extractAnimationMeta, buildFfmpegArgs, detectChromePath, detectFfmpeg } from './export.js';

const examplesDir = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'examples');

describe('parseResolution', () => {
  it('parses 1080p preset', () => {
    assert.deepStrictEqual(parseResolution('1080p'), { width: 1920, height: 1080 });
  });

  it('parses 720p preset', () => {
    assert.deepStrictEqual(parseResolution('720p'), { width: 1280, height: 720 });
  });

  it('parses 480p preset', () => {
    assert.deepStrictEqual(parseResolution('480p'), { width: 854, height: 480 });
  });

  it('parses 360p preset', () => {
    assert.deepStrictEqual(parseResolution('360p'), { width: 640, height: 360 });
  });

  it('parses 4k preset', () => {
    assert.deepStrictEqual(parseResolution('4k'), { width: 3840, height: 2160 });
  });

  it('parses case-insensitive presets', () => {
    assert.deepStrictEqual(parseResolution('4K'), { width: 3840, height: 2160 });
    assert.deepStrictEqual(parseResolution('1080P'), { width: 1920, height: 1080 });
  });

  it('parses WxH format', () => {
    assert.deepStrictEqual(parseResolution('800x600'), { width: 800, height: 600 });
  });

  it('parses large WxH', () => {
    assert.deepStrictEqual(parseResolution('2560x1440'), { width: 2560, height: 1440 });
  });

  it('throws on invalid string', () => {
    assert.throws(() => parseResolution('invalid'), /Invalid resolution/);
  });

  it('throws on empty string', () => {
    assert.throws(() => parseResolution(''), /Invalid resolution/);
  });

  it('throws on negative dimensions', () => {
    assert.throws(() => parseResolution('-100x200'), /Invalid resolution/);
  });
});

describe('extractAnimationMeta', () => {
  it('extracts metadata from pulse.json', () => {
    const json = JSON.parse(readFileSync(join(examplesDir, 'pulse.json'), 'utf-8'));
    const meta = extractAnimationMeta(json);

    assert.strictEqual(meta.width, 512);
    assert.strictEqual(meta.height, 512);
    assert.strictEqual(meta.frameRate, 60);
    assert.strictEqual(meta.inPoint, 0);
    assert.strictEqual(meta.outPoint, 120);
    assert.strictEqual(meta.totalFrames, 120);
    assert.strictEqual(meta.durationSeconds, 2);
  });

  it('throws on missing required fields', () => {
    assert.throws(() => extractAnimationMeta({ w: 100 }), /missing required fields/);
  });

  it('throws on zero-duration animation', () => {
    assert.throws(
      () => extractAnimationMeta({ w: 512, h: 512, fr: 60, ip: 0, op: 0 }),
      /zero duration/,
    );
  });

  it('throws on negative duration', () => {
    assert.throws(
      () => extractAnimationMeta({ w: 512, h: 512, fr: 60, ip: 10, op: 5 }),
      /zero duration/,
    );
  });
});

describe('buildFfmpegArgs', () => {
  const ffmpeg = '/usr/bin/ffmpeg';

  it('builds MP4 args with stdin pipe', () => {
    const result = buildFfmpegArgs(ffmpeg, 'mp4', 30, 'out.mp4');

    assert.strictEqual(result.ffmpegPath, ffmpeg);
    assert.strictEqual(result.pass1, undefined);
    assert.ok(result.pass2.includes('-c:v'));
    assert.ok(result.pass2.includes('libx264'));
    assert.ok(result.pass2.includes('pipe:0'));
    assert.ok(result.pass2.includes('yuv420p'));
    assert.strictEqual(result.pass2[result.pass2.length - 1], 'out.mp4');
  });

  it('builds WebM args with alpha support', () => {
    const result = buildFfmpegArgs(ffmpeg, 'webm', 30, 'out.webm');

    assert.strictEqual(result.pass1, undefined);
    assert.ok(result.pass2.includes('libvpx-vp9'));
    assert.ok(result.pass2.includes('yuva420p'));
    assert.ok(result.pass2.includes('pipe:0'));
  });

  it('builds GIF args with two passes', () => {
    const result = buildFfmpegArgs(ffmpeg, 'gif', 24, 'out.gif', '/tmp/kin3o-test');

    assert.ok(result.pass1, 'GIF should have pass1');
    assert.ok(result.pass1!.includes('palettegen=stats_mode=diff'));
    assert.ok(result.pass2.includes('paletteuse=dither=floyd_steinberg'));
    assert.strictEqual(result.pass2[result.pass2.length - 1], 'out.gif');
  });

  it('throws for GIF without temp dir', () => {
    assert.throws(() => buildFfmpegArgs(ffmpeg, 'gif', 24, 'out.gif'), /temp directory/);
  });

  it('includes explicit PNG input codec', () => {
    const result = buildFfmpegArgs(ffmpeg, 'mp4', 30, 'out.mp4');
    const cvIndex = result.pass2.indexOf('-c:v');
    // First -c:v should be png (input), second should be libx264 (output)
    assert.strictEqual(result.pass2[cvIndex + 1], 'png');
  });

  it('uses correct framerate', () => {
    const result = buildFfmpegArgs(ffmpeg, 'mp4', 60, 'out.mp4');
    const frIdx = result.pass2.indexOf('-framerate');
    assert.strictEqual(result.pass2[frIdx + 1], '60');
  });
});

describe('detectChromePath', () => {
  it('returns a string or null without throwing', () => {
    const result = detectChromePath();
    assert.ok(result === null || typeof result === 'string');
  });
});

describe('detectFfmpeg', () => {
  it('returns a string or null without throwing', () => {
    const result = detectFfmpeg();
    assert.ok(result === null || typeof result === 'string');
  });
});

describe('background defaults', () => {
  function defaultBg(format: string): string {
    return format === 'mp4' ? '#000000' : 'transparent';
  }

  it('mp4 default is black', () => {
    assert.strictEqual(defaultBg('mp4'), '#000000');
  });

  it('gif default is transparent', () => {
    assert.strictEqual(defaultBg('gif'), 'transparent');
  });

  it('webm default is transparent', () => {
    assert.strictEqual(defaultBg('webm'), 'transparent');
  });
});
