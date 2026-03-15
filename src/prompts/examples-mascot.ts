/**
 * kin3o mascot — "kinesis orb"
 *
 * A golden circle with three trailing motion arcs, suggesting movement.
 * The orb pulses, arcs stagger-animate via trim paths, and opacity breathes.
 *
 * Static version: continuous loop (logo animation)
 * Interactive version: idle → hover (arcs expand) → click (burst)
 */

const ease = (from: number[], to: number[], tStart: number, tEnd: number, last = false) => {
  const kf: Record<string, unknown> = { t: tStart, s: from };
  if (!last) {
    kf['o'] = { x: [0.42], y: [0] };
    kf['i'] = { x: [0.58], y: [1] };
  }
  return last ? { t: tEnd, s: to } : kf;
};

// Shared arc shape: a semicircle path at a given radius
const makeArc = (radius: number, strokeWidth: number, opacity: number, trimDelay: number, color: [number, number, number, number]) => {
  const r = radius;
  return {
    ty: 'gr',
    nm: `Arc r${radius}`,
    it: [
      {
        ty: 'sh',
        nm: 'Arc Path',
        ks: {
          a: 0,
          k: {
            c: false,
            v: [[-r, 0], [0, -r], [r, 0]],
            i: [[0, 0], [-r * 0.552, 0], [0, 0]],
            o: [[0, -r * 0.552], [r * 0.552, 0], [0, 0]],
          },
        },
      },
      {
        ty: 'st',
        nm: 'Stroke',
        c: { a: 0, k: color },
        o: { a: 0, k: opacity },
        w: { a: 0, k: strokeWidth },
        lc: 2,
        lj: 2,
      },
      {
        ty: 'tm',
        nm: 'Trim',
        s: { a: 0, k: 0 },
        e: {
          a: 1,
          k: [
            ease([0], [100], trimDelay, trimDelay + 40),
            { t: trimDelay + 40, s: [100] },
          ],
        },
        o: { a: 0, k: 0 },
      },
      {
        ty: 'tr',
        p: { a: 0, k: [0, 0] },
        a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] },
        r: { a: 0, k: -90 },
        o: { a: 0, k: 100 },
      },
    ],
  };
};

const ORB_COLOR: [number, number, number, number] = [0.839, 0.722, 0.416, 1]; // warm gold
const ARC_COLOR: [number, number, number, number] = [0.839, 0.722, 0.416, 1];

/** Static mascot — continuous breathing loop */
export const MASCOT_STATIC = {
  v: '5.5.2',
  fr: 60,
  ip: 0,
  op: 120,
  w: 512,
  h: 512,
  ddd: 0,
  assets: [],
  layers: [
    // Layer 0: The orb (golden circle)
    {
      ty: 4,
      ind: 0,
      nm: 'Orb',
      ip: 0,
      op: 120,
      st: 0,
      ddd: 0,
      ks: {
        a: { a: 0, k: [0, 0] },
        p: { a: 0, k: [256, 256] },
        s: {
          a: 1,
          k: [
            ease([100, 100], [110, 110], 0, 60),
            ease([110, 110], [100, 100], 60, 120, true),
          ],
        },
        r: { a: 0, k: 0 },
        o: {
          a: 1,
          k: [
            ease([80], [100], 0, 60),
            ease([100], [80], 60, 120, true),
          ],
        },
      },
      shapes: [
        {
          ty: 'gr',
          nm: 'Circle',
          it: [
            {
              ty: 'el',
              nm: 'Ellipse',
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [80, 80] },
            },
            {
              ty: 'fl',
              nm: 'Fill',
              c: { a: 0, k: ORB_COLOR },
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
    },
    // Layer 1: Motion arcs
    {
      ty: 4,
      ind: 1,
      nm: 'Arcs',
      ip: 0,
      op: 120,
      st: 0,
      ddd: 0,
      ks: {
        a: { a: 0, k: [0, 0] },
        p: { a: 0, k: [256, 256] },
        s: {
          a: 1,
          k: [
            ease([95, 95], [105, 105], 0, 60),
            ease([105, 105], [95, 95], 60, 120, true),
          ],
        },
        r: {
          a: 1,
          k: [
            ease([0], [8], 0, 60),
            ease([8], [0], 60, 120, true),
          ],
        },
        o: { a: 0, k: 100 },
      },
      shapes: [
        makeArc(70, 4, 70, 0, ARC_COLOR),
        makeArc(95, 3, 50, 10, ARC_COLOR),
        makeArc(120, 2, 30, 20, ARC_COLOR),
      ],
      bm: 0,
    },
  ],
};

/** Interactive mascot — idle/hover/active states */
const MASCOT_IDLE = {
  ...MASCOT_STATIC,
  // Same as static — gentle breathing
};

const MASCOT_HOVER = {
  v: '5.5.2',
  fr: 60,
  ip: 0,
  op: 60,
  w: 512,
  h: 512,
  ddd: 0,
  assets: [],
  layers: [
    {
      ty: 4,
      ind: 0,
      nm: 'Orb',
      ip: 0,
      op: 60,
      st: 0,
      ddd: 0,
      ks: {
        a: { a: 0, k: [0, 0] },
        p: { a: 0, k: [256, 256] },
        s: {
          a: 1,
          k: [
            ease([100, 100], [115, 115], 0, 30),
            { t: 30, s: [115, 115] },
          ],
        },
        r: { a: 0, k: 0 },
        o: { a: 0, k: 100 },
      },
      shapes: [
        {
          ty: 'gr',
          nm: 'Circle',
          it: [
            {
              ty: 'el',
              nm: 'Ellipse',
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [80, 80] },
            },
            {
              ty: 'fl',
              nm: 'Fill',
              c: { a: 0, k: [0.929, 0.812, 0.502, 1] }, // brighter gold on hover
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
    },
    {
      ty: 4,
      ind: 1,
      nm: 'Arcs',
      ip: 0,
      op: 60,
      st: 0,
      ddd: 0,
      ks: {
        a: { a: 0, k: [0, 0] },
        p: { a: 0, k: [256, 256] },
        s: {
          a: 1,
          k: [
            ease([100, 100], [120, 120], 0, 30),
            { t: 30, s: [120, 120] },
          ],
        },
        r: {
          a: 1,
          k: [
            ease([0], [15], 0, 30),
            { t: 30, s: [15] },
          ],
        },
        o: { a: 0, k: 100 },
      },
      shapes: [
        makeArc(70, 5, 90, 0, [0.929, 0.812, 0.502, 1]),
        makeArc(95, 4, 70, 5, [0.929, 0.812, 0.502, 1]),
        makeArc(120, 3, 50, 10, [0.929, 0.812, 0.502, 1]),
      ],
      bm: 0,
    },
  ],
};

export const MASCOT_INTERACTIVE = {
  animations: {
    idle: MASCOT_IDLE,
    hover: MASCOT_HOVER,
  },
  stateMachine: {
    initial: 'idle_state',
    states: [
      {
        name: 'idle_state',
        type: 'PlaybackState',
        animation: 'idle',
        loop: true,
        autoplay: true,
        transitions: [
          { type: 'Transition', toState: 'hover_state', guards: [{ type: 'Boolean', inputName: 'hovering', conditionType: 'Equal', compareTo: true }] },
        ],
      },
      {
        name: 'hover_state',
        type: 'PlaybackState',
        animation: 'hover',
        autoplay: true,
        transitions: [
          { type: 'Transition', toState: 'idle_state', guards: [{ type: 'Boolean', inputName: 'hovering', conditionType: 'Equal', compareTo: false }] },
        ],
      },
    ],
    interactions: [
      { type: 'PointerEnter', actions: [{ type: 'SetBoolean', inputName: 'hovering', value: true }] },
      { type: 'PointerExit', actions: [{ type: 'SetBoolean', inputName: 'hovering', value: false }] },
    ],
    inputs: [
      { name: 'hovering', type: 'Boolean', value: false },
    ],
  },
};
