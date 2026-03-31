const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// ---------------------------------------------------------------------------
// Step navigation
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
  requestAnimationFrame(() => next.classList.add('active'));
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let currentBooking = null;
let currentToken = null;

// ---------------------------------------------------------------------------
// On load: check for magic link token in URL
// ---------------------------------------------------------------------------
async function init() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (token) {
    currentToken = token;
    await loadBooking({ token });
  }
}

// ---------------------------------------------------------------------------
// Load booking by token or code
// ---------------------------------------------------------------------------
async function loadBooking({ token, code }) {
  try {
    let url;
    if (IS_DEV) {
      // Dev mode: show mock booking
      currentBooking = {
        booking: {
          id: 'dev-123',
          meeting_type: 'intro',
          date: '2026-04-01',
          start_hour: 14,
          duration_minutes: 30,
          status: 'confirmed',
          booker_name: 'Jane Doe',
          booking_code: 'AC-7K2F',
        },
        can_reschedule: true,
        can_cancel: true,
      };
      renderBookingDetails(currentBooking);
      goToStep('details');
      return;
    }

    if (token) {
      url = `/api/manage?token=${encodeURIComponent(token)}`;
    } else {
      url = `/api/manage?code=${encodeURIComponent(code)}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Booking not found');
    }

    currentBooking = await res.json();
    currentToken = token || null;
    renderBookingDetails(currentBooking);
    goToStep('details');
  } catch (err) {
    alert(err.message || 'Could not find that booking.');
  }
}

// ---------------------------------------------------------------------------
// Render booking details
// ---------------------------------------------------------------------------
function renderBookingDetails(data) {
  const b = data.booking;
  const dateObj = new Date(b.date + 'T12:00:00');
  const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const h = Math.floor(b.start_hour);
  const m = Math.round((b.start_hour - h) * 60);
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 || 12;
  const timeStr = `${display}:${String(m).padStart(2, '0')} ${period}`;

  const typeNames = {
    intro: '30-Minute Intro Call',
    'deep-dive': '60-Minute Deep Dive',
  };

  document.getElementById('manage-type').textContent = typeNames[b.meeting_type] || b.meeting_type;
  document.getElementById('manage-datetime').textContent = `${dateStr} at ${timeStr}`;
  document.getElementById('manage-code').textContent = `Booking code: ${b.booking_code}`;

  const statusEl = document.getElementById('manage-status');
  statusEl.textContent = b.status.charAt(0).toUpperCase() + b.status.slice(1);
  statusEl.style.color = b.status === 'confirmed' ? 'var(--spring-mint)' : 'var(--spring-rose)';
  statusEl.style.fontWeight = '600';
  statusEl.style.marginTop = '8px';

  const actions = document.getElementById('booking-actions');
  actions.style.display = (data.can_reschedule || data.can_cancel) ? 'flex' : 'none';
  document.getElementById('reschedule-btn').style.display = data.can_reschedule ? 'flex' : 'none';
  document.getElementById('cancel-btn').style.display = data.can_cancel ? 'flex' : 'none';
}

// ---------------------------------------------------------------------------
// Lookup form
// ---------------------------------------------------------------------------
document.getElementById('lookup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = document.getElementById('field-code').value.trim();
  const email = document.getElementById('field-recover-email').value.trim();

  if (code) {
    await loadBooking({ code });
  } else if (email) {
    await sendRecovery(email);
  }
});

// ---------------------------------------------------------------------------
// Send recovery email
// ---------------------------------------------------------------------------
async function sendRecovery(email) {
  try {
    if (IS_DEV) {
      goToStep('recovery-sent');
      return;
    }

    await fetch('/api/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    goToStep('recovery-sent');
  } catch (err) {
    alert('Failed to send recovery email.');
  }
}

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------
document.getElementById('cancel-btn').addEventListener('click', async () => {
  if (!confirm('Are you sure you want to cancel this booking?')) return;

  try {
    if (!IS_DEV) {
      const body = currentToken ? { token: currentToken } : { booking_code: currentBooking.booking.booking_code };
      const res = await fetch('/api/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Cancellation failed');
      }
    }

    document.getElementById('cancel-summary').textContent =
      `${document.getElementById('manage-type').textContent} on ${document.getElementById('manage-datetime').textContent}`;
    goToStep('cancelled');
  } catch (err) {
    alert(err.message || 'Cancellation failed.');
  }
});

// ---------------------------------------------------------------------------
// Reschedule (redirect to main booking flow with reschedule context — v1 simple)
// ---------------------------------------------------------------------------
document.getElementById('reschedule-btn').addEventListener('click', () => {
  // For v1: redirect to main page with a reschedule parameter.
  // The main booking flow will handle creating a new booking and cancelling the old one.
  const b = currentBooking.booking;
  const params = new URLSearchParams({
    reschedule: b.booking_code,
    type: b.meeting_type,
  });
  window.location.href = '/?' + params.toString();
});

// ---------------------------------------------------------------------------
// Back button
// ---------------------------------------------------------------------------
document.getElementById('back-to-lookup').addEventListener('click', () => {
  goToStep('lookup');
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
init();
