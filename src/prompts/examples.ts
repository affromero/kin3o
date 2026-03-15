/** Hand-crafted, validated Lottie JSON examples for few-shot prompting */

export const PULSING_CIRCLE = {
  v: '5.5.2',
  fr: 60,
  ip: 0,
  op: 120,
  w: 512,
  h: 512,
  ddd: 0,
  assets: [],
  layers: [
    {
      ty: 4,
      ind: 0,
      nm: 'Pulsing Circle',
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
            {
              t: 0,
              s: [80, 80],
              o: { x: [0.42], y: [0] },
              i: { x: [0.58], y: [1] },
            },
            {
              t: 60,
              s: [120, 120],
              o: { x: [0.42], y: [0] },
              i: { x: [0.58], y: [1] },
            },
            { t: 120, s: [80, 80] },
          ],
        },
        r: { a: 0, k: 0 },
        o: { a: 0, k: 100 },
      },
      shapes: [
        {
          ty: 'gr',
          nm: 'Circle Group',
          it: [
            {
              ty: 'el',
              nm: 'Ellipse',
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [200, 200] },
            },
            {
              ty: 'fl',
              nm: 'Fill',
              c: { a: 0, k: [0.851, 0.467, 0.024, 1] },
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
  ],
};

export const WAVEFORM_BARS = {
  v: '5.5.2',
  fr: 60,
  ip: 0,
  op: 120,
  w: 512,
  h: 512,
  ddd: 0,
  assets: [],
  layers: [
    ...[0, 1, 2].map((i) => {
      const x = 206 + i * 50;
      const delay = i * 15;
      return {
        ty: 4,
        ind: i,
        nm: `Bar ${i + 1}`,
        ip: 0,
        op: 120,
        st: 0,
        ddd: 0,
        ks: {
          a: { a: 0, k: [0, 0] },
          p: { a: 0, k: [x, 256] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 0 },
          o: { a: 0, k: 100 },
        },
        shapes: [
          {
            ty: 'gr',
            nm: `Bar Group ${i + 1}`,
            it: [
              {
                ty: 'rc',
                nm: 'Rectangle',
                p: { a: 0, k: [0, 0] },
                s: {
                  a: 1,
                  k: [
                    {
                      t: delay,
                      s: [30, 40],
                      o: { x: [0.42], y: [0] },
                      i: { x: [0.58], y: [1] },
                    },
                    {
                      t: 30 + delay,
                      s: [30, 160],
                      o: { x: [0.42], y: [0] },
                      i: { x: [0.58], y: [1] },
                    },
                    {
                      t: 60 + delay,
                      s: [30, 40],
                      o: { x: [0.42], y: [0] },
                      i: { x: [0.58], y: [1] },
                    },
                    {
                      t: 90 + delay,
                      s: [30, 120],
                      o: { x: [0.42], y: [0] },
                      i: { x: [0.58], y: [1] },
                    },
                    { t: 120, s: [30, 40] },
                  ],
                },
                r: { a: 0, k: 4 },
              },
              {
                ty: 'fl',
                nm: 'Fill',
                c: { a: 0, k: [0.851, 0.467, 0.024, 1] },
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
      };
    }),
  ],
};
