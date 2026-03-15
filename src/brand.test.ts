import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { brand } from './brand.js';

describe('brand.toCssVars', () => {
  it('produces valid CSS :root block', () => {
    const css = brand.toCssVars();
    assert.ok(css.startsWith(':root {'));
    assert.ok(css.endsWith('}'));
  });

  it('includes all color tokens as CSS custom properties', () => {
    const css = brand.toCssVars();
    assert.ok(css.includes('--accent:'));
    assert.ok(css.includes('--bg:'));
    assert.ok(css.includes('--text:'));
    assert.ok(css.includes('--success:'));
    assert.ok(css.includes('--warm:'));
  });

  it('maps brand color values into the CSS output', () => {
    const css = brand.toCssVars();
    assert.ok(css.includes(brand.colors.accent));
    assert.ok(css.includes(brand.colors.bg));
    assert.ok(css.includes(brand.colors.success));
  });

  it('includes gradient token', () => {
    const css = brand.toCssVars();
    assert.ok(css.includes('--gradient-text:'));
    assert.ok(css.includes(brand.gradients.text));
  });
});
