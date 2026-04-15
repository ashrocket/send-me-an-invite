/**
 * Minimal calendar widget — renders a 7-column CSS grid month view.
 * @param {HTMLElement} container
 * @param {{ onDateSelect: (dateStr: string) => void, availableDays: string[]|null }} options
 */
export function createCalendar(container, { onDateSelect, availableDays }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 60);

  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth();

  function render() {
    container.innerHTML = '';

    // Navigation bar
    const nav = document.createElement('div');
    nav.className = 'cal-nav';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'cal-nav-btn';
    prevBtn.type = 'button';
    prevBtn.setAttribute('aria-label', 'Previous month');
    prevBtn.textContent = '‹';

    const title = document.createElement('span');
    title.className = 'cal-nav-title';
    title.textContent = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(currentYear, currentMonth));

    const nextBtn = document.createElement('button');
    nextBtn.className = 'cal-nav-btn';
    nextBtn.type = 'button';
    nextBtn.setAttribute('aria-label', 'Next month');
    nextBtn.textContent = '›';

    prevBtn.addEventListener('click', () => {
      if (currentMonth === 0) { currentMonth = 11; currentYear--; }
      else { currentMonth--; }
      render();
    });

    nextBtn.addEventListener('click', () => {
      if (currentMonth === 11) { currentMonth = 0; currentYear++; }
      else { currentMonth++; }
      render();
    });

    nav.append(prevBtn, title, nextBtn);
    container.appendChild(nav);

    // Day-name header row
    const header = document.createElement('div');
    header.className = 'cal-header';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(name => {
      const span = document.createElement('span');
      span.className = 'day-name';
      span.textContent = name;
      header.appendChild(span);
    });
    container.appendChild(header);

    // Day cells
    const grid = document.createElement('div');
    grid.className = 'cal-days';

    const firstDow = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrev = new Date(currentYear, currentMonth, 0).getDate();

    // Leading cells from previous month
    for (let i = 0; i < firstDow; i++) {
      grid.appendChild(makeCell(daysInPrev - firstDow + 1 + i, ['other-month', 'disabled'], true));
    }

    // Current-month cells
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(currentYear, currentMonth, d);
      const dateStr = toDateStr(currentYear, currentMonth + 1, d);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isPast = date < today;
      const isTooFar = date > maxDate;
      const isToday = date.getTime() === today.getTime();

      const classes = ['cal-day'];
      if (isToday) classes.push('today');

      const disabled = isWeekend || isPast || isTooFar
        || (availableDays != null && !availableDays.includes(dateStr));

      if (disabled) {
        classes.push('disabled');
        grid.appendChild(makeCell(d, classes, true, dateStr));
      } else {
        const cell = makeCell(d, classes, false, dateStr);
        cell.addEventListener('click', () => {
          container.querySelectorAll('.cal-day.selected')
            .forEach(el => el.classList.remove('selected'));
          cell.classList.add('selected');
          onDateSelect(dateStr);
        });
        grid.appendChild(cell);
      }
    }

    // Trailing cells
    const total = firstDow + daysInMonth;
    const trailing = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let i = 1; i <= trailing; i++) {
      grid.appendChild(makeCell(i, ['other-month', 'disabled'], true));
    }

    container.appendChild(grid);
  }

  render();
}

function makeCell(label, classes, disabled, dateStr) {
  const btn = document.createElement('button');
  btn.className = classes.join(' ');
  btn.type = 'button';
  btn.textContent = label;
  btn.disabled = disabled;
  if (dateStr) btn.dataset.date = dateStr;
  return btn;
}

function toDateStr(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
