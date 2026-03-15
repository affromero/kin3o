import { writeFileSync, readFileSync } from 'node:fs';
import { DotLottie, getAnimations, getStateMachines } from '@dotlottie/dotlottie-js';

export interface PackageOptions {
  animations: Array<{ id: string; data: object }>;
  stateMachine?: { id: string; data: object };
}

export async function packageDotLottie(options: PackageOptions): Promise<Buffer> {
  const dotlottie = new DotLottie();

  for (const anim of options.animations) {
    dotlottie.addAnimation({
      id: anim.id,
      data: anim.data as Parameters<typeof dotlottie.addAnimation>[0]['data'],
    });
  }

  if (options.stateMachine) {
    dotlottie.addStateMachine({
      id: options.stateMachine.id,
      data: options.stateMachine.data as Parameters<typeof dotlottie.addStateMachine>[0]['data'],
    });
  }

  const arrayBuffer = await dotlottie.toArrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function writeDotLottie(outputPath: string, options: PackageOptions): Promise<void> {
  const buffer = await packageDotLottie(options);
  writeFileSync(outputPath, buffer);
}

export async function readDotLottie(filePath: string): Promise<{
  animations: Record<string, object>;
  stateMachine?: object;
}> {
  const fileBuffer = readFileSync(filePath);
  const uint8 = new Uint8Array(
    fileBuffer.buffer,
    fileBuffer.byteOffset,
    fileBuffer.byteLength,
  );

  const animations: Record<string, object> = {};
  const animRecord = await getAnimations(uint8);
  for (const [id, data] of Object.entries(animRecord)) {
    animations[id] = data as object;
  }

  let stateMachine: object | undefined;
  const smRecord = await getStateMachines(uint8);
  const smEntries = Object.entries(smRecord);
  if (smEntries.length > 0) {
    const [, smStr] = smEntries[0]!;
    stateMachine = JSON.parse(smStr) as object;
  }

  return { animations, stateMachine };
}
