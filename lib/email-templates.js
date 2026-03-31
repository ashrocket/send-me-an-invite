import { formatTimeLabel } from './calendar.js';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function wrap(body) {
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; color: #4A4A4A;">${body}</div>`;
}

export function confirmationEmail(recipient, booking, host, meetingTypes, baseUrl) {
  const type = meetingTypes[booking.meeting_type];
  const typeName = type ? type.name : booking.meeting_type;
  const dateStr = formatDate(booking.date);
  const timeStr = formatTimeLabel(booking.start_hour);
  const manageUrl = `${baseUrl}/manage?token=${booking.magic_token}`;

  if (recipient === 'host') {
    return {
      subject: `New booking: ${booking.booker_name} — ${typeName}`,
      html: wrap(`
        <h2 style="color: #333;">New Booking</h2>
        <p><strong>${booking.booker_name}</strong> (${booking.booker_email}) booked a <strong>${typeName}</strong>.</p>
        <p><strong>When:</strong> ${dateStr} at ${timeStr}</p>
        ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
        <p style="color: #8A8A8A; font-size: 14px;">Booking code: ${booking.booking_code}</p>
      `),
    };
  }

  return {
    subject: `Your meeting with ${host.name} is confirmed`,
    html: wrap(`
      <h2 style="color: #333;">You're Booked!</h2>
      <p>Your <strong>${typeName}</strong> with <strong>${host.name}</strong> is confirmed.</p>
      <p><strong>When:</strong> ${dateStr} at ${timeStr}</p>
      <p><strong>Booking code:</strong> ${booking.booking_code}</p>
      <p><a href="${manageUrl}" style="color: #6C5CE7;">Manage your booking</a> (reschedule or cancel)</p>
    `),
  };
}

export function cancellationEmail(recipient, booking, host, meetingTypes, baseUrl) {
  const type = meetingTypes[booking.meeting_type];
  const typeName = type ? type.name : booking.meeting_type;
  const dateStr = formatDate(booking.date);
  const timeStr = formatTimeLabel(booking.start_hour);
  return {
    subject: `Cancelled: ${typeName} on ${dateStr}`,
    html: wrap(`
      <h2 style="color: #333;">Booking Cancelled</h2>
      <p>The <strong>${typeName}</strong> between <strong>${booking.booker_name}</strong> and <strong>${host.name}</strong> on ${dateStr} at ${timeStr} has been cancelled.</p>
      <p style="color: #8A8A8A; font-size: 14px;">Booking code: ${booking.booking_code}</p>
    `),
  };
}

export function rescheduleEmail(recipient, oldBooking, newBooking, host, meetingTypes, baseUrl) {
  const type = meetingTypes[newBooking.meeting_type];
  const typeName = type ? type.name : newBooking.meeting_type;
  const newDate = formatDate(newBooking.date);
  const newTime = formatTimeLabel(newBooking.start_hour);
  const manageUrl = `${baseUrl}/manage?token=${newBooking.magic_token}`;
  const who = recipient === 'host' ? oldBooking.booker_name : host.name;

  return {
    subject: `Rescheduled: ${typeName} — now ${newDate}`,
    html: wrap(`
      <h2 style="color: #333;">Booking Rescheduled</h2>
      <p>Your <strong>${typeName}</strong> with <strong>${who}</strong> has been moved.</p>
      <p><strong>New time:</strong> ${newDate} at ${newTime}</p>
      ${recipient === 'booker' ? `<p><a href="${manageUrl}" style="color: #6C5CE7;">Manage your booking</a></p>` : ''}
    `),
  };
}

export function recoveryEmail(bookings, host, meetingTypes, baseUrl) {
  const links = bookings.map(b => {
    const type = meetingTypes[b.meeting_type];
    const typeName = type ? type.name : b.meeting_type;
    const dateStr = formatDate(b.date);
    const timeStr = formatTimeLabel(b.start_hour);
    const manageUrl = `${baseUrl}/manage?token=${b.magic_token}`;
    return `<li><a href="${manageUrl}" style="color: #6C5CE7;">${typeName}</a> — ${dateStr} at ${timeStr} (${b.booking_code})</li>`;
  }).join('');

  return {
    subject: `Your bookings with ${host.name}`,
    html: wrap(`
      <h2 style="color: #333;">Your Bookings</h2>
      <p>Here are your upcoming bookings with <strong>${host.name}</strong>:</p>
      <ul>${links}</ul>
    `),
  };
}
