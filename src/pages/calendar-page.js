import '../core/bootstrap.js';
import '../styles/main.css';
import { APP_NAME } from '../core/config.js';
import { mountNavbar, showAlert } from '../core/ui.js';
import { requireAuth, requireFamily } from '../core/auth.js';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../services/event-service.js';

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

// Builds a datetime-local input value ("YYYY-MM-DDTHH:mm") from local date parts —
// never toISOString().split, which would show UTC time instead of local time.
function toDateTimeLocalValue(isoString) {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const session = await requireAuth();
if (session) {
  const family = await requireFamily();
  if (family) {
    mountNavbar(document.getElementById('navbar'), {
      activePage: 'calendar',
      session,
      isParent: family.role === 'parent',
    });

    const alertContainer = document.getElementById('alertContainer');
    const addEventSection = document.getElementById('addEventSection');
    const eventForm = document.getElementById('eventForm');
    const addEventBtn = document.getElementById('addEventBtn');
    const addEventSpinner = document.getElementById('addEventSpinner');
    const addEventBtnLabel = document.getElementById('addEventBtnLabel');
    const titleInput = document.getElementById('titleInput');
    const locationInput = document.getElementById('locationInput');
    const startsAtInput = document.getElementById('startsAtInput');
    const endsAtInput = document.getElementById('endsAtInput');
    const descriptionInput = document.getElementById('descriptionInput');
    const eventsTableBody = document.getElementById('eventsTableBody');
    const emptyState = document.getElementById('emptyState');
    const actionsHeader = document.getElementById('actionsHeader');
    const editWarning = document.getElementById('editWarning');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    const isParent = family.role === 'parent';
    if (isParent) {
      addEventSection.classList.remove('d-none');
      actionsHeader.classList.remove('d-none');
    }

    let editingEventId = null;
    let currentEvents = [];

    function showSuccessAlert(message) {
      showAlert(alertContainer, message, 'success');
      const el = alertContainer.firstElementChild;
      setTimeout(() => {
        if (el?.isConnected) {
          el.remove();
        }
      }, 2500);
    }

    function enterEditMode(event) {
      editingEventId = event.id;
      titleInput.value = event.title;
      locationInput.value = event.location ?? '';
      startsAtInput.value = toDateTimeLocalValue(event.starts_at);
      endsAtInput.value = event.ends_at ? toDateTimeLocalValue(event.ends_at) : '';
      descriptionInput.value = event.description ?? '';
      editWarning.classList.remove('d-none');
      addEventBtnLabel.textContent = 'Save changes';
      eventForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function exitEditMode() {
      editingEventId = null;
      eventForm.reset();
      editWarning.classList.add('d-none');
      addEventBtnLabel.textContent = 'Add event';
    }

    async function loadEvents() {
      const events = await getEvents(family.family_id);
      currentEvents = events;

      if (events.length === 0) {
        eventsTableBody.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
      }

      emptyState.classList.add('d-none');
      eventsTableBody.innerHTML = events
        .map((event) => {
          const actionsCell = isParent
            ? `
              <td>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary me-1 edit-event-btn"
                  data-id="${event.id}"
                  aria-label="Edit"
                >
                  <i class="bi bi-pencil"></i>
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-danger delete-event-btn"
                  data-id="${event.id}"
                  aria-label="Delete"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </td>`
            : '';

          return `
            <tr>
              <td>${formatEventWhen(event)}</td>
              <td>${escapeHtml(event.title)}</td>
              <td>${event.location ? escapeHtml(event.location) : ''}</td>
              <td>${event.description ? escapeHtml(event.description) : ''}</td>
              ${actionsCell}
            </tr>`;
        })
        .join('');
    }

    try {
      await loadEvents();
    } catch (error) {
      console.error(error);
      showAlert(alertContainer, mapError(error));
    }

    if (isParent) {
      cancelEditBtn.addEventListener('click', () => {
        exitEditMode();
      });

      eventsTableBody.addEventListener('click', async (event) => {
        const editBtn = event.target.closest('.edit-event-btn');
        const deleteBtn = event.target.closest('.delete-event-btn');

        if (editBtn) {
          const calendarEvent = currentEvents.find((e) => e.id === editBtn.dataset.id);
          if (calendarEvent) {
            enterEditMode(calendarEvent);
          }
          return;
        }

        if (deleteBtn) {
          const id = deleteBtn.dataset.id;
          const confirmed = confirm('Are you sure you want to delete this event?');
          if (!confirmed) return;

          try {
            await deleteEvent(id);
            if (editingEventId === id) {
              exitEditMode();
            }
            showSuccessAlert('Event deleted.');
            await loadEvents();
          } catch (error) {
            console.error(error);
            showAlert(alertContainer, mapError(error));
          }
        }
      });

      eventForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        alertContainer.innerHTML = '';

        const title = titleInput.value.trim();
        const startsAtValue = startsAtInput.value;
        const endsAtValue = endsAtInput.value;

        if (!title) {
          showAlert(alertContainer, 'Title is required.');
          return;
        }
        if (!startsAtValue) {
          showAlert(alertContainer, 'Start time is required.');
          return;
        }

        const startsAt = new Date(startsAtValue);
        const endsAt = endsAtValue ? new Date(endsAtValue) : null;

        if (endsAt && endsAt <= startsAt) {
          showAlert(alertContainer, 'End time must be after start time.');
          return;
        }

        addEventBtn.disabled = true;
        addEventSpinner.classList.remove('d-none');

        const isEditing = editingEventId !== null;
        const eventData = {
          title,
          description: descriptionInput.value.trim(),
          location: locationInput.value.trim(),
          startsAt: startsAt.toISOString(),
          endsAt: endsAt ? endsAt.toISOString() : null,
        };

        try {
          if (isEditing) {
            await updateEvent(editingEventId, eventData);
          } else {
            await createEvent({ familyId: family.family_id, ...eventData });
          }

          exitEditMode();
          showSuccessAlert(isEditing ? 'Event updated.' : 'Event added successfully.');
          await loadEvents();
        } catch (error) {
          console.error(error);
          showAlert(alertContainer, mapError(error));
        } finally {
          addEventBtn.disabled = false;
          addEventSpinner.classList.add('d-none');
        }
      });
    }
  }
}
