const API = '/api';

// ─── DOM Refs 
const $html = document.documentElement;
const $themeToggle = document.getElementById('theme-toggle');
const $themeKnob = document.querySelector('.theme-toggle-knob');

const $eventsGrid = document.getElementById('events-grid');
const $emptyState = document.getElementById('empty-state');
const $modalCreate = document.getElementById('modal-create');
const $modalDetails = document.getElementById('modal-details');
const $detailsContent = document.getElementById('event-details-content');
const $formCreate = document.getElementById('form-create-event');
const $filterUpcoming = document.getElementById('filter-upcoming');
const $sortDate = document.getElementById('sort-date');

// Stats
const $statTotal = document.getElementById('stat-total-events');
const $statUpcoming = document.getElementById('stat-upcoming');
const $statRegs = document.getElementById('stat-registrations');
const $statAvailable = document.getElementById('stat-available');

// ─── State 
let allEvents = [];

// ─── Theme Management 
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);

  $themeToggle.addEventListener('click', () => {
    const current = $html.getAttribute('data-theme');
    setTheme(current === 'light' ? 'dark' : 'light');
  });
}

function setTheme(theme) {
  $html.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  $themeKnob.textContent = theme === 'light' ? '☀️' : '🌙';
}

// ─── Helpers  
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isUpcoming(dateStr) {
  return new Date(dateStr) > new Date();
}

function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Toast Notifications  
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✨', error: '⚠️', info: '💡' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3500);
}

// ─── API Helpers  
async function apiGet(path) {
  const res = await fetch(`${API}${path}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiPatch(path) {
  const res = await fetch(`${API}${path}`, { method: 'PATCH' });
  return res.json();
}

// ─── Fetch & Render Events 
async function loadEvents() {
  const params = new URLSearchParams();
  if ($filterUpcoming.checked) params.set('upcoming', 'true');
  if ($sortDate.checked) params.set('sort', 'date');

  const query = params.toString() ? `?${params}` : '';
  const result = await apiGet(`/events${query}`);

  if (result.success) {
    allEvents = result.data;
    renderEvents(allEvents);
    updateStats(allEvents);
  }
}

function updateStats(events) {
  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.date) > now);
  const totalRegs = events.reduce((sum, e) => sum + e.totalRegistrations, 0);
  const totalAvail = events.reduce((sum, e) => sum + e.availableSeats, 0);

  animateCounter($statTotal, events.length);
  animateCounter($statUpcoming, upcoming.length);
  animateCounter($statRegs, totalRegs);
  animateCounter($statAvailable, totalAvail);
}

function animateCounter(el, target) {
  const current = parseInt(el.textContent) || 0;
  if (current === target) return;

  const diff = target - current;
  const steps = Math.min(Math.abs(diff), 20);
  const increment = diff / steps;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    if (step >= steps) {
      el.textContent = target;
      clearInterval(timer);
    } else {
      el.textContent = Math.round(current + increment * step);
    }
  }, 30);
}

// ─── Render Event Cards 
function renderEvents(events) {
  if (events.length === 0) {
    $eventsGrid.innerHTML = '';
    $emptyState.classList.remove('hidden');
    return;
  }

  $emptyState.classList.add('hidden');
  $eventsGrid.innerHTML = events.map((event, index) => createEventCard(event, index)).join('');

  document.querySelectorAll('.event-card').forEach((card) => {
    card.addEventListener('click', () => openEventDetails(card.dataset.id));
  });
}

function createEventCard(event, index) {
  const upcoming = isUpcoming(event.date);
  const fillPct = Math.round(
    ((event.totalSeats - event.availableSeats) / event.totalSeats) * 100
  );

  let badgeClass = 'badge-upcoming';
  let badgeText = '● Upcoming';
  if (!upcoming) {
    badgeClass = 'badge-past';
    badgeText = '○ Past';
  } else if (event.availableSeats <= 0) {
    badgeClass = 'badge-full';
    badgeText = '✕ Full';
  }

  let barClass = '';
  if (fillPct >= 90) barClass = 'bar-danger';
  else if (fillPct >= 70) barClass = 'bar-warning';

  const delay = (index % 10) * 0.05;

  return `
    <article class="event-card" data-id="${event.id}" style="animation-delay: ${delay}s">
      <div class="event-card-header">
        <h3 class="event-card-title">${escapeHtml(event.name)}</h3>
        <span class="event-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="event-card-meta">
        <div class="meta-item">
          <span class="meta-icon">🕒</span>
          <span>${formatDate(event.date)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-icon">🎫</span>
          <span>${event.totalRegistrations} registered</span>
        </div>
      </div>
      <div class="seat-bar-wrapper">
        <div class="seat-bar-labels">
          <span>${event.availableSeats} seats left</span>
          <span>${fillPct}% filled</span>
        </div>
        <div class="seat-bar">
          <div class="seat-bar-fill ${barClass}" style="width: ${fillPct}%"></div>
        </div>
      </div>
    </article>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Event Details Modal 
async function openEventDetails(eventId) {
  const result = await apiGet(`/events/${eventId}`);
  if (!result.success) {
    showToast(result.error?.message || 'Failed to load event.', 'error');
    return;
  }

  const event = result.data;
  const upcoming = isUpcoming(event.date);
  const fillPct = Math.round(
    ((event.totalSeats - event.availableSeats) / event.totalSeats) * 100
  );

  $detailsContent.innerHTML = `
    <div class="detail-header">
      <h2 class="detail-title">${escapeHtml(event.name)}</h2>
      <div class="detail-meta">
        <div class="meta-item">
          <span class="meta-icon">🕒</span>
          <span>${formatDate(event.date)}</span>
        </div>
      </div>
    </div>

    <div class="detail-stats">
      <div class="detail-stat">
        <div class="detail-stat-value">${event.totalSeats}</div>
        <div class="detail-stat-label">Total Seats</div>
      </div>
      <div class="detail-stat">
        <div class="detail-stat-value">${event.totalRegistrations}</div>
        <div class="detail-stat-label">Registered</div>
      </div>
      <div class="detail-stat">
        <div class="detail-stat-value">${event.availableSeats}</div>
        <div class="detail-stat-label">Available</div>
      </div>
    </div>

    <div class="seat-bar-wrapper" style="margin-bottom:1.5rem">
      <div class="seat-bar">
        <div class="seat-bar-fill ${fillPct >= 90 ? 'bar-danger' : fillPct >= 70 ? 'bar-warning' : ''}" style="width: ${fillPct}%"></div>
      </div>
    </div>

    ${
      upcoming && event.availableSeats > 0
        ? `
      <div class="register-section">
        <h3>Register for this Event</h3>
        <div class="register-row">
          <input type="text" id="register-name" placeholder="Enter your full name" autocomplete="off" />
          <button class="btn btn-register-action btn-sm" id="btn-register">Register Now</button>
        </div>
      </div>
    `
        : upcoming && event.availableSeats <= 0
        ? `<div class="register-section"><h3>🚫 This event is fully booked</h3></div>`
        : `<div class="register-section"><h3>⏰ This event has already passed</h3></div>`
    }

    <div class="registrations-section">
      <h3>Registrations (${event.registrations.length})</h3>
      ${
        event.registrations.length > 0
          ? `<div class="reg-list">
              ${event.registrations
                .map(
                  (r) => `
                  <div class="reg-item">
                    <div class="reg-info">
                      <div class="reg-avatar">${getInitials(r.userName)}</div>
                      <div>
                        <div class="reg-name">${escapeHtml(r.userName)}</div>
                        <div class="reg-time">${formatDate(r.registeredAt)}</div>
                      </div>
                    </div>
                    <button class="btn btn-danger btn-sm btn-cancel" data-reg-id="${r.id}">Cancel</button>
                  </div>
                `
                )
                .join('')}
            </div>`
          : `<div class="reg-empty">No registrations yet.</div>`
      }
    </div>
  `;

  const $btnRegister = document.getElementById('btn-register');
  if ($btnRegister) {
    $btnRegister.addEventListener('click', () => registerForEvent(eventId));
  }

  document.querySelectorAll('.btn-cancel').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      cancelRegistration(btn.dataset.regId, eventId);
    });
  });

  $modalDetails.classList.remove('hidden');
}

// ─── Register for Event 
async function registerForEvent(eventId) {
  const $input = document.getElementById('register-name');
  const userName = $input.value.trim();

  if (!userName) {
    showToast('Please enter your name.', 'error');
    return;
  }

  const result = await apiPost(`/events/${eventId}/register`, { userName });

  if (result.success) {
    showToast(`Woohoo! ${userName} is registered.`, 'success');
    openEventDetails(eventId); // Refresh detail
    loadEvents(); // Refresh list
  } else {
    showToast(result.error?.message || 'Registration failed.', 'error');
  }
}

// ─── Cancel Registration 
async function cancelRegistration(regId, eventId) {
  const result = await apiPatch(`/registrations/${regId}/cancel`);

  if (result.success) {
    showToast('Registration cancelled.', 'info');
    openEventDetails(eventId); // Refresh detail
    loadEvents(); // Refresh list
  } else {
    showToast(result.error?.message || 'Cancellation failed.', 'error');
  }
}

// ─── Create Event 
$formCreate.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('event-name').value.trim();
  const totalSeats = parseInt(document.getElementById('event-seats').value);
  const date = document.getElementById('event-date').value;

  if (!name || !totalSeats || !date) {
    showToast('Please fill in all fields.', 'error');
    return;
  }

  const result = await apiPost('/events', {
    name,
    totalSeats,
    date: new Date(date).toISOString(),
  });

  if (result.success) {
    showToast(`Event "${name}" created successfully!`, 'success');
    $formCreate.reset();
    $modalCreate.classList.add('hidden');
    loadEvents();
  } else {
    showToast(result.error?.message || 'Failed to create event.', 'error');
  }
});

// ─── Modal Controls
document.getElementById('btn-create-event').addEventListener('click', () => {
  $modalCreate.classList.remove('hidden');
});

document.getElementById('close-create').addEventListener('click', () => {
  $modalCreate.classList.add('hidden');
});

document.getElementById('close-details').addEventListener('click', () => {
  $modalDetails.classList.add('hidden');
});

// Close modals on overlay click
[$modalCreate, $modalDetails].forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
});

// Close modals on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    $modalCreate.classList.add('hidden');
    $modalDetails.classList.add('hidden');
  }
});

// ─── Filter/Sort change
$filterUpcoming.addEventListener('change', loadEvents);
$sortDate.addEventListener('change', loadEvents);

// ─── Initialize 
initTheme();
loadEvents();
