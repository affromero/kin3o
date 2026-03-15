/** Hand-crafted interactive button example for few-shot prompting */

const BUTTON_BASE = {
  v: '5.5.2',
  fr: 60,
  w: 512,
  h: 512,
  ddd: 0,
  assets: [],
};

const makeButtonLayer = (
  color: [number, number, number, number],
  scaleKf: object,
  op: number,
) => ({
  ty: 4,
  ind: 0,
  nm: 'Button',
  ip: 0,
  op,
  st: 0,
  ddd: 0,
  ks: {
    a: { a: 0, k: [0, 0] },
    p: { a: 0, k: [256, 256] },
    s: scaleKf,
    r: { a: 0, k: 0 },
    o: { a: 0, k: 100 },
  },
  shapes: [
    {
      ty: 'gr',
      nm: 'Button Shape',
      it: [
        {
          ty: 'rc',
          nm: 'Rect',
          p: { a: 0, k: [0, 0] },
          s: { a: 0, k: [200, 80] },
          r: { a: 0, k: 20 },
        },
        {
          ty: 'fl',
          nm: 'Fill',
          c: { a: 0, k: color },
          o: { a: 0, k: 100 },
          r: 1,
        },
        {
          ty: 'tr',
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 0 },
          o: { a: 0, k: 100 },
        },
      ],
    },
  ],
  bm: 0,
});

const IDLE_ANIM = {
  ...BUTTON_BASE,
  ip: 0,
  op: 120,
  layers: [
    makeButtonLayer(
      [0.851, 0.467, 0.024, 1],
      { a: 0, k: [100, 100] },
      120,
    ),
  ],
};

const HOVER_ANIM = {
  ...BUTTON_BASE,
  ip: 0,
  op: 60,
  layers: [
    makeButtonLayer(
      [0.937, 0.553, 0.098, 1],
      {
        a: 1,
        k: [
          { t: 0, s: [100, 100], o: { x: [0.42], y: [0] }, i: { x: [0.58], y: [1] } },
          { t: 30, s: [108, 108] },
        ],
      },
      60,
    ),
  ],
};

const PRESSED_ANIM = {
  ...BUTTON_BASE,
  ip: 0,
  op: 30,
  layers: [
    makeButtonLayer(
      [0.725, 0.376, 0.016, 1],
      {
        a: 1,
        k: [
          { t: 0, s: [108, 108], o: { x: [0.42], y: [0] }, i: { x: [0.58], y: [1] } },
          { t: 15, s: [95, 95] },
        ],
      },
      30,
    ),
  ],
};

export const INTERACTIVE_BUTTON = {
  animations: {
    idle: IDLE_ANIM,
    hover: HOVER_ANIM,
    pressed: PRESSED_ANIM,
  },
  stateMachine: {
    initial: 'idle_state',
    states: [
      {
        name: 'idle_state',
        type: 'PlaybackState',
        animation: 'idle',
        transitions: [
          { type: 'Transition', toState: 'hover_state', guards: [{ type: 'Boolean', inputName: 'hovering', conditionType: 'Equal', compareTo: true }] },
        ],
      },
      {
        name: 'hover_state',
        type: 'PlaybackState',
        animation: 'hover',
        transitions: [
          { type: 'Transition', toState: 'idle_state', guards: [{ type: 'Boolean', inputName: 'hovering', conditionType: 'Equal', compareTo: false }] },
          { type: 'Transition', toState: 'pressed_state', guards: [{ type: 'Boolean', inputName: 'pressing', conditionType: 'Equal', compareTo: true }] },
        ],
      },
      {
        name: 'pressed_state',
        type: 'PlaybackState',
        animation: 'pressed',
        transitions: [
          { type: 'Transition', toState: 'hover_state', guards: [{ type: 'Boolean', inputName: 'pressing', conditionType: 'Equal', compareTo: false }] },
        ],
      },
    ],
    interactions: [
      { type: 'PointerEnter', actions: [{ type: 'SetBoolean', inputName: 'hovering', value: true }] },
      { type: 'PointerExit', actions: [{ type: 'SetBoolean', inputName: 'hovering', value: false }] },
      { type: 'PointerDown', actions: [{ type: 'SetBoolean', inputName: 'pressing', value: true }] },
      { type: 'PointerUp', actions: [{ type: 'SetBoolean', inputName: 'pressing', value: false }] },
    ],
    inputs: [
      { name: 'hovering', type: 'Boolean', value: false },
      { name: 'pressing', type: 'Boolean', value: false },
    ],
  },
};
