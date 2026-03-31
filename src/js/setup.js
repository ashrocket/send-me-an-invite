import { loadTheme } from './theme-loader.js';

loadTheme();

const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const setupState = {
  step: 1,
  googleConnected: false,
  name: '',
  headline: '',
  meetingTypes: [],
  startHour: 9,
  endHour: 17,
  theme: 'spring-easter',
  tier: 'hosted',
  subdomain: '',
};

// Theme previews
const THEMES = [
  { id: 'spring-easter', name: 'Spring Easter', primary: '#C3B1E1', accent: '#A8E6CF' },
  { id: 'brutalist', name: 'Brutalist', primary: '#1a1a1a', accent: '#FF3333' },
  { id: 'midnight', name: 'Midnight', primary: '#7C5CFC', accent: '#5B8DEF' },
  { id: 'terminal', name: 'Terminal', primary: '#00FF41', accent: '#008F11' },
  { id: 'ocean', name: 'Ocean', primary: '#0891B2', accent: '#06B6D4' },
  { id: 'sunset', name: 'Sunset', primary: '#F97316', accent: '#EC4899' },
  { id: 'monochrome', name: 'Monochrome', primary: '#111111', accent: '#666666' },
  { id: 'neon', name: 'Neon', primary: '#FF2D95', accent: '#00F0FF' },
  { id: 'earth', name: 'Earth', primary: '#2D6A4F', accent: '#A47148' },
  { id: 'candy', name: 'Candy', primary: '#FF6B9D', accent: '#FFE66D' },
];

// ---------------------------------------------------------------------------
// Step navigation
// ---------------------------------------------------------------------------
const STEPS = ['welcome', 'google', 'profile', 'theme', 'hosting', 'done'];

function goToStep(name) {
  const current = document.querySelector('.step.active');
  const next = document.querySelector(`[data-step="${name}"]`);
  if (!next || current === next) return;

  if (current) {
    current.classList.remove('active');
    current.classList.add('exiting');
    current.addEventListener('animationend', () => {
      current.classList.remove('exiting');
    }, { once: true });
  }
  requestAnimationFrame(() => next.classList.add('active'));

  // Update progress dots
  const stepIndex = STEPS.indexOf(name);
  setupState.step = stepIndex + 1;
  document.querySelectorAll('.progress-dot').forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i < stepIndex) dot.classList.add('done');
    if (i === stepIndex) dot.classList.add('active');
  });
}

// ---------------------------------------------------------------------------
// Step 1: Welcome
// ---------------------------------------------------------------------------
document.getElementById('start-btn').addEventListener('click', () => {
  goToStep('google');
});

// ---------------------------------------------------------------------------
// Step 2: Connect Google Calendar
// ---------------------------------------------------------------------------
document.getElementById('connect-google-btn').addEventListener('click', async () => {
  if (IS_DEV) {
    // Simulate connection in dev mode
    setupState.googleConnected = true;
    const btn = document.getElementById('connect-google-btn');
    btn.classList.add('connected');
    btn.textContent = 'Connected';
    document.getElementById('google-next-btn').disabled = false;

    // Show mock calendars
    const list = document.getElementById('calendar-list');
    list.hidden = false;
    list.innerHTML = `
      <div class="calendar-item"><input type="checkbox" checked /> <span>ashley@gmail.com (primary)</span></div>
      <div class="calendar-item"><input type="checkbox" /> <span>Work Calendar</span></div>
    `;
    return;
  }

  // Production: open OAuth popup
  try {
    const res = await fetch('/api/auth/url');
    const { url } = await res.json();
    const popup = window.open(url, 'google-auth', 'width=500,height=600');

    // Listen for OAuth success message from popup
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'oauth-success') {
        setupState.googleConnected = true;
        const btn = document.getElementById('connect-google-btn');
        btn.classList.add('connected');
        btn.textContent = 'Connected';
        document.getElementById('google-next-btn').disabled = false;
      }
    }, { once: true });
  } catch (err) {
    console.error('OAuth error:', err);
    alert('Failed to start Google authorization. Please try again.');
  }
});

document.getElementById('google-next-btn').addEventListener('click', () => {
  goToStep('profile');
});

// ---------------------------------------------------------------------------
// Step 3: Profile
// ---------------------------------------------------------------------------
document.getElementById('add-type-btn').addEventListener('click', () => {
  const editor = document.getElementById('meeting-types-editor');
  const row = document.createElement('div');
  row.className = 'meeting-type-row';
  row.innerHTML = `
    <input type="text" placeholder="Name" />
    <select>
      <option value="15">15m</option>
      <option value="30" selected>30m</option>
      <option value="45">45m</option>
      <option value="60">60m</option>
    </select>
    <button type="button" class="remove-type-btn" title="Remove">&#10005;</button>
  `;
  editor.appendChild(row);
  row.querySelector('.remove-type-btn').addEventListener('click', () => row.remove());
});

// Wire up existing remove buttons
document.querySelectorAll('.remove-type-btn').forEach(btn => {
  btn.addEventListener('click', () => btn.closest('.meeting-type-row').remove());
});

document.getElementById('profile-form').addEventListener('submit', (e) => {
  e.preventDefault();
  setupState.name = document.getElementById('setup-name').value.trim();
  setupState.headline = document.getElementById('setup-headline').value.trim();
  setupState.startHour = parseInt(document.getElementById('setup-start-hour').value);
  setupState.endHour = parseInt(document.getElementById('setup-end-hour').value);

  // Collect meeting types
  setupState.meetingTypes = [];
  document.querySelectorAll('.meeting-type-row').forEach(row => {
    const name = row.querySelector('input').value.trim();
    const duration = parseInt(row.querySelector('select').value);
    if (name) {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
      setupState.meetingTypes.push({ id, name, duration, description: '' });
    }
  });

  goToStep('theme');
});

// ---------------------------------------------------------------------------
// Step 4: Theme picker
// ---------------------------------------------------------------------------
function renderThemeGrid() {
  const grid = document.getElementById('theme-grid');
  grid.innerHTML = THEMES.map(t => `
    <div class="theme-card ${t.id === setupState.theme ? 'selected' : ''}" data-theme="${t.id}">
      <div class="theme-swatch" style="background: linear-gradient(135deg, ${t.primary}, ${t.accent});"></div>
      <div class="theme-card-name">${t.name}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      grid.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      setupState.theme = card.dataset.theme;
    });
  });
}

renderThemeGrid();

document.getElementById('skip-theme').addEventListener('click', (e) => {
  e.preventDefault();
  goToStep('hosting');
});

document.getElementById('theme-next-btn').addEventListener('click', () => {
  goToStep('hosting');
});

// ---------------------------------------------------------------------------
// Step 5: Hosting
// ---------------------------------------------------------------------------
document.querySelectorAll('.tier-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.tier-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    setupState.tier = card.dataset.tier;
    // Show/hide subdomain field
    document.getElementById('setup-subdomain').closest('.form-group').style.display =
      setupState.tier === 'hosted' ? '' : 'none';
  });
});

document.getElementById('hosting-next-btn').addEventListener('click', () => {
  if (setupState.tier === 'hosted') {
    setupState.subdomain = document.getElementById('setup-subdomain').value.trim().toLowerCase();
    if (!setupState.subdomain) {
      alert('Please choose a subdomain.');
      return;
    }
  }

  // Show done step
  const url = setupState.tier === 'hosted'
    ? `${setupState.subdomain}.agentical.com`
    : 'your-domain.com';
  document.getElementById('done-url').textContent = url;
  goToStep('done');
  launchConfetti();
});

// ---------------------------------------------------------------------------
// Step 6: Done
// ---------------------------------------------------------------------------
document.getElementById('copy-url-btn').addEventListener('click', () => {
  const url = document.getElementById('done-url').textContent;
  navigator.clipboard.writeText(`https://${url}`).then(() => {
    document.getElementById('copy-url-btn').textContent = 'Copied!';
    setTimeout(() => { document.getElementById('copy-url-btn').textContent = 'Copy URL'; }, 2000);
  });
});

document.getElementById('copy-mcp-btn').addEventListener('click', () => {
  const url = document.getElementById('done-url').textContent;
  const mcpConfig = JSON.stringify({
    agentical: {
      command: 'npx',
      args: ['agentical-mcp', '--host', url],
    }
  }, null, 2);
  navigator.clipboard.writeText(mcpConfig).then(() => {
    document.getElementById('copy-mcp-btn').textContent = 'Copied!';
    setTimeout(() => { document.getElementById('copy-mcp-btn').textContent = 'Copy MCP Config'; }, 2000);
  });
});

// ---------------------------------------------------------------------------
// Back buttons
// ---------------------------------------------------------------------------
document.querySelectorAll('.back-btn').forEach(btn => {
  btn.addEventListener('click', () => goToStep(btn.dataset.back));
});

// ---------------------------------------------------------------------------
// Confetti (same as main app)
// ---------------------------------------------------------------------------
function launchConfetti() {
  const canvas = document.getElementById('confetti');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#C3B1E1', '#A8E6CF', '#FFEAA7', '#FFB7B2', '#A0D2DB'];
  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    w: Math.random() * 8 + 4,
    h: Math.random() * 6 + 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    vy: Math.random() * 3 + 2,
    vx: Math.random() * 2 - 1,
    rot: Math.random() * 360,
    vr: Math.random() * 6 - 3,
    opacity: 1,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of pieces) {
      if (p.opacity <= 0) continue;
      alive = true;
      p.y += p.vy; p.x += p.vx; p.rot += p.vr;
      if (frame > 80) p.opacity -= 0.015;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    frame++;
    if (alive) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(draw);
}
