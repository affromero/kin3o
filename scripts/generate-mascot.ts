import { writeFileSync } from 'node:fs';
import { writeDotLottie } from '../src/packager.js';
import { MASCOT_STATIC, MASCOT_INTERACTIVE } from '../src/prompts/examples-mascot.js';

// Static mascot JSON
writeFileSync('examples/mascot.json', JSON.stringify(MASCOT_STATIC, null, 2));
console.log('Created examples/mascot.json');

// Interactive mascot .lottie
const animIds = Object.keys(MASCOT_INTERACTIVE.animations) as Array<keyof typeof MASCOT_INTERACTIVE.animations>;
await writeDotLottie('examples/mascot.lottie', {
  animations: animIds.map(id => ({
    id,
    data: MASCOT_INTERACTIVE.animations[id],
  })),
  stateMachine: { id: 'mascot-sm', data: MASCOT_INTERACTIVE.stateMachine },
});
console.log('Created examples/mascot.lottie');
