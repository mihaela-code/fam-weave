import '../../core/bootstrap.js';
import '../../styles/main.css';
import { APP_NAME } from '../../core/config.js';
import { mountNavbar, showAlert } from '../../core/ui.js';
import { requireAuth, requireFamily } from '../../core/auth.js';
import { getEvents } from '../../services/event-service.js';

document.title = `${APP_NAME} — Calendar`;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mapError() {
  return 'Something went wrong. Please try again.';
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatEventWhen(event) {
  const starts = dateTimeFormatter.format(new Date(event.starts_at));
  if (!event.ends_at) return starts;
  const ends = dateTimeFormatter.format(new Date(event.ends_at));
  return `${starts} – ${ends}`;
}

const session = await requireAuth();
if (session) {
  const family = await requireFamily();
  if (family) {
    mountNavbar(document.getElementById('navbar'), { activePage: 'calendar', session });

    const alertContainer = document.getElementById('alertContainer');
    const eventsTableBody = document.getElementById('eventsTableBody');
    const emptyState = document.getElementById('emptyState');

    async function loadEvents() {
      const events = await getEvents(family.family_id);

      if (events.length === 0) {
        eventsTableBody.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
      }

      emptyState.classList.add('d-none');
      eventsTableBody.innerHTML = events
        .map(
          (event) => `
            <tr>
              <td>${formatEventWhen(event)}</td>
              <td>${escapeHtml(event.title)}</td>
              <td>${event.location ? escapeHtml(event.location) : ''}</td>
              <td>${event.description ? escapeHtml(event.description) : ''}</td>
            </tr>`
        )
        .join('');
    }

    try {
      await loadEvents();
    } catch (error) {
      console.error(error);
      showAlert(alertContainer, mapError(error));
    }
  }
}
