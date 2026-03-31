import { describe, it, expect } from 'vitest';
import { validateTheme, themeToCssProperties, THEME_SCHEMA_KEYS } from '../../lib/theme.js';

const VALID_THEME = {
  name: 'Test Theme',
  colors: {
    primary: '#C3B1E1',
    'primary-light': '#E8DFF5',
    accent: '#A8E6CF',
    'accent-light': '#D4F5E9',
    background: '#FFF8E7',
    surface: '#FFFFFF',
    text: '#4A4A4A',
    'text-muted': '#8A8A8A',
    border: '#E8E3D9',
    shadow: 'rgba(195, 177, 225, 0.15)',
    success: '#A8E6CF',
    error: '#FFB7B2',
  },
  fonts: { body: 'Inter', heading: 'Inter', mono: 'JetBrains Mono' },
  shape: { 'card-radius': '20px', 'btn-radius': '12px' },
  effects: {
    cursor: 'dragonfly',
    'ambient-dots': true,
    creatures: true,
    'confetti-colors': ['#C3B1E1', '#A8E6CF'],
  },
};

describe('validateTheme', () => {
  it('returns { valid: true } for a complete theme', () => {
    expect(validateTheme(VALID_THEME)).toEqual({ valid: true, errors: [] });
  });

  it('returns errors for missing required color keys', () => {
    const broken = { ...VALID_THEME, colors: { primary: '#000' } };
    const result = validateTheme(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns errors for missing name', () => {
    const { name, ...noName } = VALID_THEME;
    const result = validateTheme(noName);
    expect(result.valid).toBe(false);
  });
});

describe('themeToCssProperties', () => {
  it('converts colors to --spring-* CSS custom properties', () => {
    const css = themeToCssProperties(VALID_THEME);
    expect(css).toContain('--spring-primary: #C3B1E1');
    expect(css).toContain('--spring-text: #4A4A4A');
    expect(css).toContain('--spring-accent: #A8E6CF');
  });

  it('converts shape to CSS custom properties', () => {
    const css = themeToCssProperties(VALID_THEME);
    expect(css).toContain('--card-radius: 20px');
    expect(css).toContain('--btn-radius: 12px');
  });

  it('converts fonts to CSS custom properties', () => {
    const css = themeToCssProperties(VALID_THEME);
    expect(css).toContain('--font-body: Inter');
  });
});
