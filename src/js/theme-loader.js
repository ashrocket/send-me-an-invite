const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Default theme (spring-easter) — used in dev mode and as fallback
const DEFAULT_THEME = {
  name: 'Spring Easter',
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
  fonts: {
    body: 'Inter',
    heading: 'Inter',
    mono: 'JetBrains Mono',
  },
  shape: {
    'card-radius': '20px',
    'btn-radius': '12px',
  },
  effects: {
    cursor: 'dragonfly',
    'ambient-dots': true,
    creatures: true,
    'confetti-colors': ['#C3B1E1', '#A8E6CF', '#FFEAA7', '#FFB7B2', '#A0D2DB'],
  },
};

/**
 * Load and apply the current theme.
 * In dev mode, uses the default Spring Easter theme.
 * In production, fetches from /api/theme.
 */
export async function loadTheme() {
  let theme = DEFAULT_THEME;

  if (!IS_DEV) {
    try {
      const res = await fetch('/api/theme');
      if (res.ok) {
        const data = await res.json();
        // If API returns a full theme object, use it
        // If it returns just { name: "theme-name" }, use default for now
        if (data.colors) {
          theme = data;
        }
      }
    } catch (err) {
      console.error('Failed to load theme, using default:', err);
    }
  }

  applyTheme(theme);
  return theme;
}

/**
 * Apply a theme object to the page by setting CSS custom properties on :root.
 */
export function applyTheme(theme) {
  const root = document.documentElement;

  // Apply colors as --spring-* properties
  if (theme.colors) {
    for (const [key, value] of Object.entries(theme.colors)) {
      root.style.setProperty(`--spring-${key}`, value);
    }
  }

  // Apply fonts
  if (theme.fonts) {
    if (theme.fonts.body) {
      root.style.setProperty('--font-family', `'${theme.fonts.body}', -apple-system, BlinkMacSystemFont, sans-serif`);
    }
    if (theme.fonts.heading) {
      root.style.setProperty('--font-heading', `'${theme.fonts.heading}', -apple-system, BlinkMacSystemFont, sans-serif`);
    }
    if (theme.fonts.mono) {
      root.style.setProperty('--font-mono', `'${theme.fonts.mono}', monospace`);
    }

    // Load Google Font if not Inter (already loaded)
    const fontsToLoad = new Set();
    for (const font of Object.values(theme.fonts)) {
      if (font && font !== 'Inter') {
        fontsToLoad.add(font);
      }
    }
    for (const font of fontsToLoad) {
      loadGoogleFont(font);
    }
  }

  // Apply shape
  if (theme.shape) {
    for (const [key, value] of Object.entries(theme.shape)) {
      root.style.setProperty(`--${key}`, value);
    }
  }

  // Apply effects
  if (theme.effects) {
    // Toggle ambient dots visibility
    const dots = document.querySelector('.ambient');
    if (dots) {
      dots.style.display = theme.effects['ambient-dots'] === false ? 'none' : '';
    }

    // Toggle creatures visibility
    const creatures = document.querySelectorAll('.creature');
    for (const c of creatures) {
      c.style.display = theme.effects.creatures === false ? 'none' : '';
    }
  }
}

/**
 * Dynamically load a Google Font.
 */
function loadGoogleFont(fontName) {
  const id = `gfont-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return; // already loaded

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

/**
 * Get confetti colors from the current theme.
 */
export function getConfettiColors(theme) {
  return theme?.effects?.['confetti-colors'] || ['#C3B1E1', '#A8E6CF', '#FFEAA7', '#FFB7B2', '#A0D2DB'];
}
