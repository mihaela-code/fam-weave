import '../core/bootstrap.js';
import '../styles/main.css';
import { APP_NAME } from '../core/config.js';
import { mountNavbar, showAlert, escapeHtml } from '../core/ui.js';
import { requireAuth, requireFamily } from '../core/auth.js';
import { getProfile } from '../services/profile-service.js';
import { getEvents } from '../services/event-service.js';
import { getExpenses, getExpensesByDateRange } from '../services/expense-service.js';
import { getFamilyMembers } from '../services/family-service.js';

document.title = `${APP_NAME} — Табло`;

// Builds a "YYYY-MM-DD" string from local date parts — never toISOString().slice(),
// which would shift the day near midnight in timezones ahead of UTC.
function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const dateFormatter = new Intl.DateTimeFormat('bg-BG', { dateStyle: 'medium' });
const monthFormatter = new Intl.DateTimeFormat('bg-BG', { month: 'long', year: 'numeric' });
const currencyFormatter = new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'EUR' });

const session = await requireAuth();
if (session) {
  const family = await requireFamily();
  if (family) {
    mountNavbar(document.getElementById('navbar'), {
      activePage: 'dashboard',
      session,
      isParent: family.role === 'parent',
    });

    const alertContainer = document.getElementById('alertContainer');
    const dashboardContent = document.getElementById('dashboardContent');
    const pageLoadingSpinner = document.getElementById('pageLoadingSpinner');
    const dashboardCardsRow = document.getElementById('dashboardCardsRow');
    const greeting = document.getElementById('greeting');
    const familySubtitle = document.getElementById('familySubtitle');
    const upcomingEventsList = document.getElementById('upcomingEventsList');
    const upcomingEventsEmpty = document.getElementById('upcomingEventsEmpty');
    const recentExpensesList = document.getElementById('recentExpensesList');
    const recentExpensesEmpty = document.getElementById('recentExpensesEmpty');
    const monthTotalLabel = document.getElementById('monthTotalLabel');
    const membersCount = document.getElementById('membersCount');
    const membersEmpty = document.getElementById('membersEmpty');
    const membersCardLink = document.getElementById('membersCardLink');

    // Reveal the page as soon as the auth/family check has resolved — no flash,
    // same gating pattern as onboarding-page.js. Data loading state is separate,
    // handled by pageLoadingSpinner/dashboardCardsRow below.
    dashboardContent.classList.remove('d-none');

    familySubtitle.textContent = family.family_name;

    // The members list is only ever shown on admin.html, which is parent-only.
    // No child-accessible member view exists, so the card is non-interactive for child.
    if (family.role !== 'parent') {
      membersCardLink.removeAttribute('href');
      membersCardLink.classList.add('pe-none');
      membersCardLink.setAttribute('aria-disabled', 'true');
    }

    function renderUpcomingEvents(events) {
      if (events.length === 0) {
        upcomingEventsList.innerHTML = '';
        upcomingEventsEmpty.classList.remove('d-none');
        return;
      }
      upcomingEventsEmpty.classList.add('d-none');
      upcomingEventsList.innerHTML = events
        .map(
          (event) =>
            `<li class="mb-1">${dateFormatter.format(new Date(event.starts_at))} — ${escapeHtml(event.title)}</li>`
        )
        .join('');
    }

    function renderRecentExpenses(expenses) {
      if (expenses.length === 0) {
        recentExpensesList.innerHTML = '';
        recentExpensesEmpty.classList.remove('d-none');
        return;
      }
      recentExpensesEmpty.classList.add('d-none');
      recentExpensesList.innerHTML = expenses
        .map((expense) => {
          const label = expense.description || expense.categories?.name || '';
          return `<li class="mb-1">${expense.spent_on} — ${escapeHtml(label)} — ${currencyFormatter.format(expense.amount)}</li>`;
        })
        .join('');
    }

    function renderMonthTotal(total) {
      monthTotalLabel.textContent =
        total === null ? '' : `Общо за ${monthFormatter.format(new Date())}: ${currencyFormatter.format(total)}`;
    }

    function renderMembers(count) {
      membersEmpty.classList.add('d-none');
      membersCount.textContent = count === null ? '—' : String(count);
    }

    const now = new Date();
    const monthStart = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
    const nextMonthStart = toLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 1));

    const [profileResult, eventsResult, expensesResult, monthExpensesResult, membersResult] = await Promise.allSettled(
      [
        getProfile(session.user.id),
        getEvents(family.family_id),
        getExpenses(family.family_id),
        getExpensesByDateRange(family.family_id, monthStart, nextMonthStart),
        getFamilyMembers(family.family_id),
      ]
    );

    let hadError = false;

    if (profileResult.status === 'fulfilled') {
      const displayName = profileResult.value.display_name;
      greeting.textContent = displayName ? `Здравей, ${displayName}!` : 'Здравей!';
    } else {
      console.error(profileResult.reason);
      hadError = true;
      greeting.textContent = 'Здравей!';
    }

    if (eventsResult.status === 'fulfilled') {
      renderUpcomingEvents(eventsResult.value.slice(0, 3));
    } else {
      console.error(eventsResult.reason);
      hadError = true;
      renderUpcomingEvents([]);
    }

    if (expensesResult.status === 'fulfilled') {
      renderRecentExpenses(expensesResult.value.slice(0, 5));
    } else {
      console.error(expensesResult.reason);
      hadError = true;
      renderRecentExpenses([]);
    }

    if (monthExpensesResult.status === 'fulfilled') {
      const total = monthExpensesResult.value.reduce((sum, expense) => sum + Number(expense.amount), 0);
      renderMonthTotal(total);
    } else {
      console.error(monthExpensesResult.reason);
      hadError = true;
      renderMonthTotal(null);
    }

    if (membersResult.status === 'fulfilled') {
      renderMembers(membersResult.value.length);
    } else {
      console.error(membersResult.reason);
      hadError = true;
      renderMembers(null);
    }

    pageLoadingSpinner.classList.add('d-none');
    dashboardCardsRow.classList.remove('d-none');

    if (hadError) {
      showAlert(alertContainer, 'Възникна грешка при зареждане на част от таблото.');
    }
  }
}
