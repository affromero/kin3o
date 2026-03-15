import { writeDotLottie } from '../src/packager.js';
import { INTERACTIVE_BUTTON } from '../src/prompts/examples-interactive.js';

const animIds = Object.keys(INTERACTIVE_BUTTON.animations) as Array<keyof typeof INTERACTIVE_BUTTON.animations>;
await writeDotLottie('examples/interactive-button.lottie', {
  animations: animIds.map(id => ({
    id,
    data: INTERACTIVE_BUTTON.animations[id],
  })),
  stateMachine: { id: 'button-sm', data: INTERACTIVE_BUTTON.stateMachine },
});
console.log('Created examples/interactive-button.lottie');
