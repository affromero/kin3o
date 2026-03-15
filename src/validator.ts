export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

type LottieJson = Record<string, unknown>;
type LottieLayer = Record<string, unknown>;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function checkAnimatedProperty(prop: unknown, path: string, errors: string[]): void {
  if (!isObject(prop)) return;
  const a = prop['a'];
  const k = prop['k'];
  if (a === 1 && Array.isArray(k)) {
    for (let i = 0; i < k.length; i++) {
      const kf = k[i];
      if (!isObject(kf)) {
        errors.push(`${path}.k[${i}] is not an object`);
        continue;
      }
      if (typeof kf['t'] !== 'number') {
        errors.push(`${path}.k[${i}] missing "t" (frame number)`);
      }
      if (!Array.isArray(kf['s'])) {
        errors.push(`${path}.k[${i}] missing "s" (start values array)`);
      }
    }
  }
}

function checkGroup(shape: Record<string, unknown>, path: string, errors: string[]): void {
  const it = shape['it'];
  if (!Array.isArray(it) || it.length === 0) {
    errors.push(`${path} group has no "it" array`);
    return;
  }
  const last = it[it.length - 1];
  if (!isObject(last) || last['ty'] !== 'tr') {
    errors.push(`${path} group "it" array must end with a "tr" (transform) item`);
  }
}

function checkColors(obj: unknown, path: string, warnings: string[]): void {
  if (!isObject(obj)) return;

  // Check if this looks like a color property
  if (obj['ty'] === 'fl' || obj['ty'] === 'st') {
    const c = obj['c'];
    if (isObject(c)) {
      const k = c['k'];
      if (Array.isArray(k) && k.length >= 3) {
        const hasHighValues = k.slice(0, 3).some((v: unknown) => typeof v === 'number' && v > 1);
        if (hasHighValues) {
          warnings.push(`${path}.c has values > 1 (likely 0-255 instead of 0-1)`);
        }
      }
    }
  }

  for (const [key, val] of Object.entries(obj)) {
    if (Array.isArray(val)) {
      val.forEach((item, i) => checkColors(item, `${path}.${key}[${i}]`, warnings));
    } else if (isObject(val)) {
      checkColors(val, `${path}.${key}`, warnings);
    }
  }
}

export function validateLottie(json: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObject(json)) {
    return { valid: false, errors: ['Input is not an object'], warnings };
  }

  const lottie = json as LottieJson;

  // Required top-level fields
  for (const field of ['w', 'h', 'fr', 'ip', 'op']) {
    if (typeof lottie[field] !== 'number') {
      errors.push(`Missing or invalid required field "${field}" (must be number)`);
    }
  }

  if (!Array.isArray(lottie['layers'])) {
    errors.push('Missing or invalid "layers" (must be array)');
    return { valid: errors.length === 0, errors, warnings };
  }

  // Warnings for optional fields
  if (typeof lottie['v'] !== 'string') {
    warnings.push('Missing "v" version string');
  }
  if (!Array.isArray(lottie['assets'])) {
    warnings.push('Missing "assets" array at top level');
  }
  if (lottie['ip'] === lottie['op']) {
    warnings.push('"op" equals "ip" — animation has zero duration');
  }

  // Check each layer
  const layers = lottie['layers'] as unknown[];
  layers.forEach((layer, i) => {
    if (!isObject(layer)) {
      errors.push(`layers[${i}] is not an object`);
      return;
    }
    const l = layer as LottieLayer;

    if (typeof l['ty'] !== 'number') {
      errors.push(`layers[${i}] missing "ty" (type, must be number)`);
    }
    if (!isObject(l['ks'])) {
      errors.push(`layers[${i}] missing "ks" (transform object)`);
    } else {
      const ks = l['ks'] as Record<string, unknown>;
      for (const prop of ['a', 'p', 's', 'r', 'o']) {
        if (ks[prop]) {
          checkAnimatedProperty(ks[prop], `layers[${i}].ks.${prop}`, errors);
        }
      }
    }
    if (typeof l['ip'] !== 'number') {
      errors.push(`layers[${i}] missing "ip" (in-point)`);
    }
    if (typeof l['op'] !== 'number') {
      errors.push(`layers[${i}] missing "op" (out-point)`);
    }

    if (l['ddd'] === undefined) {
      warnings.push(`layers[${i}] missing "ddd" field`);
    }

    // Shape layer checks
    if (l['ty'] === 4) {
      if (!Array.isArray(l['shapes']) || (l['shapes'] as unknown[]).length === 0) {
        errors.push(`layers[${i}] (shape layer) has no "shapes" array`);
      } else {
        const shapes = l['shapes'] as unknown[];
        shapes.forEach((shape, j) => {
          if (isObject(shape) && shape['ty'] === 'gr') {
            checkGroup(shape as Record<string, unknown>, `layers[${i}].shapes[${j}]`, errors);
          }
        });
      }
    }

    // Check colors recursively
    checkColors(l, `layers[${i}]`, warnings);
  });

  return { valid: errors.length === 0, errors, warnings };
}

/** Auto-fix common AI generation mistakes (returns a deep clone) */
export function autoFix(json: object): object {
  const fixed = JSON.parse(JSON.stringify(json)) as LottieJson;

  // Add version if missing
  if (typeof fixed['v'] !== 'string') {
    fixed['v'] = '5.5.2';
  }

  // Add assets if missing
  if (!Array.isArray(fixed['assets'])) {
    fixed['assets'] = [];
  }

  // Fix layers
  if (Array.isArray(fixed['layers'])) {
    for (const layer of fixed['layers'] as LottieLayer[]) {
      if (!isObject(layer)) continue;

      // Add ddd if missing
      if (layer['ddd'] === undefined) {
        layer['ddd'] = 0;
      }

      // Add st if missing
      if (layer['st'] === undefined) {
        layer['st'] = 0;
      }

      // Normalize 0-255 colors to 0-1
      normalizeColors(layer);
    }
  }

  return fixed;
}

function normalizeColors(obj: unknown): void {
  if (!isObject(obj)) return;

  if (obj['ty'] === 'fl' || obj['ty'] === 'st') {
    const c = obj['c'];
    if (isObject(c)) {
      const k = c['k'];
      if (Array.isArray(k) && k.length >= 3) {
        const hasHighValues = k.slice(0, 3).some((v: unknown) => typeof v === 'number' && v > 1);
        if (hasHighValues) {
          for (let i = 0; i < 3 && i < k.length; i++) {
            if (typeof k[i] === 'number') {
              k[i] = Math.round(((k[i] as number) / 255) * 1000) / 1000;
            }
          }
        }
      }
    }
  }

  for (const val of Object.values(obj)) {
    if (Array.isArray(val)) {
      val.forEach(item => normalizeColors(item));
    } else if (isObject(val)) {
      normalizeColors(val);
    }
  }
}
