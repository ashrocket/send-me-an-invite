import './creatures.js';
import { fetchMeetingTypes, fetchAvailability, submitBooking } from './api.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  meetingType: null,
  meetingTypes: {},      // loaded from API
  meetingTypesList: [],  // array form
  date: null,
  time: null,
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
};

// ---------------------------------------------------------------------------
// Initialize — load meeting types from API
// ---------------------------------------------------------------------------
async function init() {
  try {
    const data = await fetchMeetingTypes();
    state.meetingTypesList = data.types;
    state.meetingTypes = {};
    for (const t of data.types) {
      state.meetingTypes[t.id] = t;
    }
    renderMeetingTypes();
  } catch (err) {
    console.error('Failed to load meeting types:', err);
  }
}

function renderMeetingTypes() {
  const list = document.querySelector('.meeting-type-list');
  list.innerHTML = state.meetingTypesList.map(t => `
    <button class="meeting-type-btn" data-type="${t.id}" type="button">
      <span class="mt-name">${t.name}</span>
      <span class="mt-desc">${t.description || ''}</span>
    </button>
  `).join('');

  list.querySelectorAll('.meeting-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.meetingType = btn.dataset.type;
      document.querySelector('.selected-meeting').textContent =
        state.meetingTypes[state.meetingType].name;
      renderCalendar();
      goToStep('date');
    });
  });
}

init();

// ---------------------------------------------------------------------------
// Step navigation (unchanged)
// ---------------------------------------------------------------------------
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

  requestAnimationFrame(() => {
    next.classList.add('active');
  });
}

// ---------------------------------------------------------------------------
// Back buttons
// ---------------------------------------------------------------------------
document.querySelectorAll('.back-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    goToStep(btn.dataset.back);
  });
});

// ---------------------------------------------------------------------------
// Calendar renderer
// ---------------------------------------------------------------------------
function renderCalendar() {
  const cal = document.getElementById('calendar');
  const year = state.currentYear;
  const month = state.currentMonth;
  const today = new Date();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  let html = `
    <div class="cal-nav">
      <button class="cal-nav-btn" id="cal-prev" type="button">&#8249;</button>
      <span class="cal-nav-title">${monthNames[month]} ${year}</span>
      <button class="cal-nav-btn" id="cal-next" type="button">&#8250;</button>
    </div>
    <div class="cal-header">
      ${dayNames.map(d => `<span class="day-name">${d}</span>`).join('')}
    </div>
  `;

  for (let i = 0; i < firstDay; i++) {
    html += `<button class="cal-day other-month" type="button" disabled></button>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dayOfWeek = date.getDay();
    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isToday = date.toDateString() === today.toDateString();
    const isSelected = state.date && date.toDateString() === state.date.toDateString();

    const classes = ['cal-day'];
    if (!isWeekday || isPast) classes.push('disabled');
    if (isToday) classes.push('today');
    if (isSelected) classes.push('selected');

    html += `<button class="${classes.join(' ')}" data-date="${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}" type="button">${d}</button>`;
  }

  cal.innerHTML = html;

  document.getElementById('cal-prev').addEventListener('click', () => {
    state.currentMonth--;
    if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    state.currentMonth++;
    if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
    renderCalendar();
  });

  cal.querySelectorAll('.cal-day:not(.disabled):not(.other-month)').forEach(day => {
    day.addEventListener('click', () => {
      const [y, m, d] = day.dataset.date.split('-').map(Number);
      state.date = new Date(y, m - 1, d);
      const opts = { weekday: 'long', month: 'long', day: 'numeric' };
      document.querySelector('.selected-date').textContent =
        state.date.toLocaleDateString('en-US', opts);
      renderSlots();
      goToStep('time');
    });
  });
}

// ---------------------------------------------------------------------------
// Time slots — now fetched from API
// ---------------------------------------------------------------------------
function formatTime(hourFloat) {
  const h = Math.floor(hourFloat);
  const m = Math.round((hourFloat - h) * 60);
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 || 12;
  return `${display}:${String(m).padStart(2, '0')} ${period}`;
}

async function renderSlots() {
  const container = document.getElementById('slots');
  const mt = state.meetingTypes[state.meetingType];

  // Show loading
  container.innerHTML = `<div class="loading"><img class="egg-spinner" src="/assets/egg-spinner.svg" alt="Loading\u2026" /></div>`;

  try {
    const data = await fetchAvailability(state.date, state.meetingType, mt.duration);
    const slots = data.slots;

    if (!slots || slots.length === 0) {
      container.innerHTML = `<div class="no-slots">No available times on this day</div>`;
      return;
    }

    const morning = slots.filter(s => s < 12);
    const afternoon = slots.filter(s => s >= 12);

    if (slots.length <= 3) {
      container.innerHTML = `
        <div class="slots-flat">
          ${slots.map(s => slotButton(s)).join('')}
        </div>
      `;
      bindSlotClicks(container);
      return;
    }

    let html = '';
    if (morning.length > 0) {
      html += `
        <div class="slot-group">
          <div class="slot-group-label">Morning</div>
          <div class="slot-group-grid">
            ${morning.map(s => slotButton(s)).join('')}
          </div>
        </div>
      `;
    }
    if (afternoon.length > 0) {
      html += `
        <div class="slot-group">
          <div class="slot-group-label">Afternoon</div>
          <div class="slot-group-grid">
            ${afternoon.map(s => slotButton(s)).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
    bindSlotClicks(container);
  } catch (err) {
    console.error('Failed to load slots:', err);
    container.innerHTML = `<div class="error">Failed to load available times. Please try again.</div>`;
  }
}

function slotButton(hourFloat) {
  const isTopOfHour = hourFloat % 1 === 0;
  const classes = ['slot-btn'];
  if (isTopOfHour) classes.push('preferred');
  return `<button class="${classes.join(' ')}" data-hour="${hourFloat}" type="button">${formatTime(hourFloat)}</button>`;
}

function bindSlotClicks(container) {
  container.querySelectorAll('.slot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.time = +btn.dataset.hour;
      document.querySelector('.selected-time').textContent = btn.textContent;
      setTimeout(() => goToStep('details'), 400);
    });
  });
}

// ---------------------------------------------------------------------------
// Form submission — now calls API
// ---------------------------------------------------------------------------
document.getElementById('booking-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const notes = form.notes ? form.notes.value.trim() : '';

  if (!name || !email) return;

  const btn = document.getElementById('submit-btn');
  btn.querySelector('.btn-text').textContent = 'Booking\u2026';
  btn.querySelector('.btn-spinner').hidden = false;
  btn.disabled = true;

  try {
    const result = await submitBooking({
      meetingType: state.meetingType,
      date: state.date,
      startHour: state.time,
      name,
      email,
      notes,
    });

    document.querySelector('.confirm-summary').textContent = result.summary;
    document.querySelector('.confirm-email').textContent =
      `Booking code: ${result.booking_code}`;

    form.reset();
    goToStep('confirmation');
    launchConfetti();
  } catch (err) {
    console.error('Booking failed:', err);
    alert(err.message || 'Booking failed. Please try again.');
  } finally {
    btn.querySelector('.btn-text').textContent = 'Schedule Meeting';
    btn.querySelector('.btn-spinner').hidden = true;
    btn.disabled = false;
  }
});

// ---------------------------------------------------------------------------
// Book another
// ---------------------------------------------------------------------------
document.getElementById('book-another-btn').addEventListener('click', () => {
  state.meetingType = null;
  state.date = null;
  state.time = null;
  goToStep('meeting-type');
});

// ---------------------------------------------------------------------------
// Confetti (unchanged)
// ---------------------------------------------------------------------------
function launchConfetti() {
  const canvas = document.getElementById('confetti');
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
      p.y += p.vy;
      p.x += p.vx;
      p.rot += p.vr;
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
