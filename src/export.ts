import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn, execSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';
import puppeteer from 'puppeteer-core';
import { readDotLottie } from './packager.js';

const templateDir = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  'preview',
);

export interface ExportOptions {
  format: 'mp4' | 'webm' | 'gif';
  width: number;
  height: number;
  fps: number;
  background: string | 'transparent';
  output: string;
}

export interface AnimationMeta {
  width: number;
  height: number;
  frameRate: number;
  inPoint: number;
  outPoint: number;
  totalFrames: number;
  durationSeconds: number;
}

const RESOLUTION_PRESETS: Record<string, { width: number; height: number }> = {
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
  '360p': { width: 640, height: 360 },
  '4k': { width: 3840, height: 2160 },
};

export function parseResolution(res: string): { width: number; height: number } {
  const preset = RESOLUTION_PRESETS[res.toLowerCase()];
  if (preset) return preset;

  const match = res.match(/^(\d+)x(\d+)$/);
  if (match) {
    const width = parseInt(match[1]!, 10);
    const height = parseInt(match[2]!, 10);
    if (width > 0 && height > 0) return { width, height };
  }

  throw new Error(`Invalid resolution "${res}". Use 1080p, 720p, 480p, 360p, 4k, or WxH (e.g. 800x600)`);
}

export function detectChromePath(): string | null {
  const envPath = process.env['CHROME_PATH'];
  if (envPath) return envPath;

  if (process.platform === 'darwin') {
    const candidates = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    ];
    for (const p of candidates) {
      try {
        execSync(`test -f "${p}"`, { stdio: 'ignore' });
        return p;
      } catch { /* not found */ }
    }
  }

  if (process.platform === 'linux') {
    const candidates = ['google-chrome', 'chromium-browser', 'chromium'];
    for (const bin of candidates) {
      try {
        return execSync(`which ${bin}`, { encoding: 'utf-8' }).trim();
      } catch { /* not found */ }
    }
  }

  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
    for (const p of candidates) {
      try {
        execSync(`if exist "${p}" exit 0`, { stdio: 'ignore' });
        return p;
      } catch { /* not found */ }
    }
  }

  return null;
}

export function detectFfmpeg(): string | null {
  const envPath = process.env['FFMPEG_PATH'];
  if (envPath) return envPath;

  try {
    return execSync('which ffmpeg', { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

export function extractAnimationMeta(lottieJson: object): AnimationMeta {
  const json = lottieJson as Record<string, unknown>;
  const width = json['w'] as number;
  const height = json['h'] as number;
  const frameRate = json['fr'] as number;
  const inPoint = json['ip'] as number;
  const outPoint = json['op'] as number;

  if (typeof width !== 'number' || typeof height !== 'number' ||
      typeof frameRate !== 'number' || typeof inPoint !== 'number' ||
      typeof outPoint !== 'number') {
    throw new Error('Invalid Lottie JSON: missing required fields (w, h, fr, ip, op)');
  }

  const totalFrames = outPoint - inPoint;
  if (totalFrames <= 0) {
    throw new Error(`Animation has zero duration (op=${outPoint} equals ip=${inPoint})`);
  }

  const durationSeconds = totalFrames / frameRate;

  return { width, height, frameRate, inPoint, outPoint, totalFrames, durationSeconds };
}

export async function extractLottieJsonFromFile(filePath: string): Promise<object> {
  const ext = extname(filePath).toLowerCase();

  if (ext === '.lottie') {
    const { animations } = await readDotLottie(filePath);
    const entries = Object.entries(animations);
    if (entries.length === 0) {
      throw new Error('No animations found in .lottie file');
    }
    if (entries.length > 1) {
      console.log(`  Note: .lottie has ${entries.length} animations — exporting "${entries[0]![0]}"`);
    }
    return entries[0]![1];
  }

  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as object;
}

export function buildFfmpegArgs(
  ffmpegPath: string,
  format: ExportOptions['format'],
  fps: number,
  outputPath: string,
  tempDir?: string,
): { pass1?: string[]; pass2: string[]; ffmpegPath: string } {
  const baseInput = ['-y', '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(fps), '-i', 'pipe:0'];

  switch (format) {
    case 'mp4':
      return {
        ffmpegPath,
        pass2: [...baseInput, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '18', outputPath],
      };
    case 'webm':
      return {
        ffmpegPath,
        pass2: [...baseInput, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-crf', '30', '-b:v', '0', outputPath],
      };
    case 'gif': {
      if (!tempDir) throw new Error('GIF export requires a temp directory');
      const palette = join(tempDir, 'palette.png');
      return {
        ffmpegPath,
        pass1: [
          '-y', '-framerate', String(fps),
          '-i', join(tempDir, '%06d.png'),
          '-vf', 'palettegen=stats_mode=diff',
          palette,
        ],
        pass2: [
          '-y', '-framerate', String(fps),
          '-i', join(tempDir, '%06d.png'),
          '-i', palette,
          '-lavfi', 'paletteuse=dither=floyd_steinberg',
          outputPath,
        ],
      };
    }
  }
}

function serveExportPage(lottieJson: object, background: string): Promise<{ url: string; close: () => void }> {
  const template = readFileSync(join(templateDir, 'template-export.html'), 'utf-8');
  const html = template
    .replace('__ANIMATION_DATA__', JSON.stringify(lottieJson))
    .replace('__BACKGROUND_COLOR__', background === 'transparent' ? 'transparent' : background);

  const server = createServer((_req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  return new Promise((resolve) => {
    server.listen(0, () => {
      const port = (server.address() as AddressInfo).port;
      resolve({
        url: `http://localhost:${port}`,
        close: () => server.close(),
      });
    });
  });
}

function runFfmpeg(ffmpegPath: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });
    proc.on('error', reject);
  });
}

export async function exportAnimation(
  filePath: string,
  options: ExportOptions,
  onProgress?: (frame: number, total: number) => void,
): Promise<string> {
  const chromePath = detectChromePath();
  if (!chromePath) {
    throw new Error(
      'Chrome or Chromium not found. Install Chrome or set CHROME_PATH environment variable.' +
      (process.platform === 'darwin' ? '\n  brew install --cask google-chrome' : ''),
    );
  }

  const ffmpegPath = detectFfmpeg();
  if (!ffmpegPath) {
    throw new Error(
      'FFmpeg not found. Install FFmpeg or set FFMPEG_PATH environment variable.' +
      (process.platform === 'darwin' ? '\n  brew install ffmpeg' : ''),
    );
  }

  const lottieJson = await extractLottieJsonFromFile(filePath);
  const meta = extractAnimationMeta(lottieJson);
  const { totalFrames } = meta;

  const server = await serveExportPage(lottieJson, options.background);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  let tempDir: string | undefined;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: options.width, height: options.height });
    await page.goto(server.url, { waitUntil: 'networkidle0' });
    await page.waitForFunction('window.__animReady === true', { timeout: 10000 });

    const omitBackground = options.format !== 'mp4' && options.background === 'transparent';

    if (options.format === 'gif') {
      tempDir = mkdtempSync(join(tmpdir(), 'kin3o-export-'));

      for (let i = 0; i < totalFrames; i++) {
        await page.evaluate((f: number) => (window as unknown as { __goToFrame: (n: number) => void }).__goToFrame(f), i);
        const buffer = await page.screenshot({ type: 'png', omitBackground }) as Buffer;
        writeFileSync(join(tempDir, `${String(i).padStart(6, '0')}.png`), buffer);
        onProgress?.(i + 1, totalFrames);
      }

      const ffmpegArgs = buildFfmpegArgs(ffmpegPath, 'gif', options.fps, options.output, tempDir);
      await runFfmpeg(ffmpegPath, ffmpegArgs.pass1!);
      await runFfmpeg(ffmpegPath, ffmpegArgs.pass2);
    } else {
      const ffmpegArgs = buildFfmpegArgs(ffmpegPath, options.format, options.fps, options.output);
      const proc = spawn(ffmpegPath, ffmpegArgs.pass2, { stdio: ['pipe', 'ignore', 'pipe'] });

      let ffmpegError = '';
      proc.stderr.on('data', (chunk: Buffer) => { ffmpegError += chunk.toString(); });

      const ffmpegDone = new Promise<void>((resolve, reject) => {
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`FFmpeg exited with code ${code}: ${ffmpegError.slice(-500)}`));
        });
        proc.on('error', reject);
      });

      for (let i = 0; i < totalFrames; i++) {
        await page.evaluate((f: number) => (window as unknown as { __goToFrame: (n: number) => void }).__goToFrame(f), i);
        const buffer = await page.screenshot({ type: 'png', omitBackground }) as Buffer;

        await new Promise<void>((resolve, reject) => {
          proc.stdin.write(buffer, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        onProgress?.(i + 1, totalFrames);
      }

      proc.stdin.end();
      await ffmpegDone;
    }

    return options.output;
  } finally {
    await browser.close();
    server.close();
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}
