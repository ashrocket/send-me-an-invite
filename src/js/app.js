/**
 * Spring Scheduling Microsite — Main App
 * State machine: meeting-type → date → time → details → confirmation
 */
import './creatures.js';
import { createCalendar } from './calendar.js';
import { fetchAvailability, bookMeeting } from './api.js';
import { launchConfetti } from './confetti.js';

const TZ = 'America/Chicago';

const MEETING_TYPES = {
  'intro':      { name: '30-Minute Intro Call', duration: 30 },
  'deep-dive':  { name: '60-Minute Deep Dive',  duration: 60 },
};

let state = {
  step:            'meeting-type',
  meetingType:     null,
  meetingTypeName: null,
  selectedDate:    null,
  selectedTime:    null,
};

// ── Step visibility ──────────────────────────────────────────────────────────

function goToStep(step) {
  state.step = step;
  document.querySelectorAll('.step').forEach(el => {
    el.classList.toggle('active', el.dataset.step === step);
  });
}

// ── Date formatting helpers ──────────────────────────────────────────────────

function formatLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date(y, m - 1, d));
}

function formatTime(isoStr) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(isoStr));
}

function formatDateTime(isoStr) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
  }).format(new Date(isoStr));
}

// ── Slot rendering ───────────────────────────────────────────────────────────

function renderSlots(slots) {
  const container = document.getElementById('slots');

  if (!slots || slots.length === 0) {
    container.innerHTML =
      '<p class="no-slots">No available times on this day — please pick another date.</p>';
    return;
  }

  container.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'slots-grid';

  slots.forEach(slot => {
    const btn = document.createElement('button');
    btn.className = 'slot-btn';
    btn.type = 'button';
    btn.dataset.start = slot.start;
    btn.textContent = formatTime(slot.start);
    btn.addEventListener('click', () => handleSlotSelect(slot));
    grid.appendChild(btn);
  });

  container.appendChild(grid);
}

// ── Event handlers ───────────────────────────────────────────────────────────

function handleMeetingTypeSelect(type) {
  state.meetingType     = type;
  state.meetingTypeName = MEETING_TYPES[type]?.name ?? type;

  document.querySelector('.selected-meeting').textContent = state.meetingTypeName;

  goToStep('date');

  createCalendar(document.getElementById('calendar'), {
    onDateSelect: handleDateSelect,
    availableDays: null,
  });
}

async function handleDateSelect(dateStr) {
  state.selectedDate = dateStr;
  document.querySelector('.selected-date').textContent = formatLocalDate(dateStr);

  goToStep('time');

  const container = document.getElementById('slots');
  container.innerHTML =
    '<div class="loading"><img class="egg-spinner" src="/assets/egg-spinner.svg" alt="Loading…" /></div>';

  try {
    const data = await fetchAvailability(dateStr, state.meetingType);
    renderSlots(data.slots);
  } catch {
    container.innerHTML =
      '<p class="error">Could not load available times. Please try again.</p>';
  }
}

function handleSlotSelect(slot) {
  state.selectedTime = slot.start;
  document.querySelector('.selected-time').textContent = formatDateTime(slot.start);
  goToStep('details');
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const form       = e.target;
  const submitBtn  = document.getElementById('submit-btn');
  const btnText    = submitBtn.querySelector('.btn-text');
  const btnSpinner = submitBtn.querySelector('.btn-spinner');

  const name  = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
  const notes = form.elements.notes.value.trim();

  if (!name || !email) return;

  submitBtn.disabled  = true;
  btnText.hidden      = true;
  btnSpinner.hidden   = false;

  try {
    await bookMeeting({
      name,
      email,
      notes,
      datetime:    state.selectedTime,
      meetingType: state.meetingType,
    });

    document.querySelector('.confirm-summary').textContent =
      `${state.meetingTypeName} on ${formatDateTime(state.selectedTime)}`;
    document.querySelector('.confirm-email').textContent =
      `A confirmation will be sent to ${email}.`;

    goToStep('confirmation');
    launchConfetti();
  } catch {
    // Surface error inline — keep spinner hidden
    const errEl = form.querySelector('.form-error') ?? document.createElement('p');
    errEl.className = 'form-error';
    errEl.textContent = 'Booking failed — please try again.';
    form.appendChild(errEl);
  } finally {
    submitBtn.disabled = false;
    btnText.hidden     = false;
    btnSpinner.hidden  = true;
  }
}

function resetState() {
  state = {
    step:            'meeting-type',
    meetingType:     null,
    meetingTypeName: null,
    selectedDate:    null,
    selectedTime:    null,
  };

  document.querySelector('.selected-meeting').textContent = '';
  document.querySelector('.selected-date').textContent    = '';
  document.querySelector('.selected-time').textContent    = '';
  document.getElementById('booking-form').reset();
  document.getElementById('calendar').innerHTML = '';
  document.getElementById('slots').innerHTML    = '';

  goToStep('meeting-type');
}

// ── Init ─────────────────────────────────────────────────────────────────────

function init() {
  document.querySelectorAll('.meeting-type-btn').forEach(btn => {
    btn.addEventListener('click', () => handleMeetingTypeSelect(btn.dataset.type));
  });

  document.querySelectorAll('.back-btn[data-back]').forEach(btn => {
    btn.addEventListener('click', () => goToStep(btn.dataset.back));
  });

  document.getElementById('booking-form')
    .addEventListener('submit', handleFormSubmit);

  document.getElementById('book-another-btn')
    .addEventListener('click', resetState);
}

init();
