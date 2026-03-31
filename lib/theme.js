const REQUIRED_COLORS = [
  'primary', 'primary-light', 'accent', 'accent-light',
  'background', 'surface', 'text', 'text-muted',
  'border', 'shadow', 'success', 'error',
];

const REQUIRED_FONTS = ['body', 'heading', 'mono'];
const REQUIRED_SHAPE = ['card-radius', 'btn-radius'];

export const THEME_SCHEMA_KEYS = { REQUIRED_COLORS, REQUIRED_FONTS, REQUIRED_SHAPE };

export function validateTheme(theme) {
  const errors = [];

  if (!theme || typeof theme !== 'object') {
    return { valid: false, errors: ['Theme must be an object'] };
  }

  if (!theme.name || typeof theme.name !== 'string') {
    errors.push('Missing required field: name');
  }

  if (!theme.colors || typeof theme.colors !== 'object') {
    errors.push('Missing required field: colors');
  } else {
    for (const key of REQUIRED_COLORS) {
      if (!theme.colors[key]) errors.push(`Missing required color: ${key}`);
    }
  }

  if (!theme.fonts || typeof theme.fonts !== 'object') {
    errors.push('Missing required field: fonts');
  } else {
    for (const key of REQUIRED_FONTS) {
      if (!theme.fonts[key]) errors.push(`Missing required font: ${key}`);
    }
  }

  if (!theme.shape || typeof theme.shape !== 'object') {
    errors.push('Missing required field: shape');
  } else {
    for (const key of REQUIRED_SHAPE) {
      if (!theme.shape[key]) errors.push(`Missing required shape: ${key}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function themeToCssProperties(theme) {
  const lines = [];

  if (theme.colors) {
    for (const [key, value] of Object.entries(theme.colors)) {
      lines.push(`--spring-${key}: ${value}`);
    }
  }

  if (theme.fonts) {
    for (const [key, value] of Object.entries(theme.fonts)) {
      lines.push(`--font-${key}: ${value}`);
    }
  }

  if (theme.shape) {
    for (const [key, value] of Object.entries(theme.shape)) {
      lines.push(`--${key}: ${value}`);
    }
  }

  return lines.join(';\n') + ';';
}
