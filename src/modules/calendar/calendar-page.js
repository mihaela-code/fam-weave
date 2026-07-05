import '../../core/bootstrap.js';
import '../../styles/main.css';
import { APP_NAME } from '../../core/config.js';
import { mountNavbar } from '../../core/ui.js';
import { requireAuth, requireFamily } from '../../core/auth.js';

document.title = `${APP_NAME} — Calendar`;

const session = await requireAuth();
if (session) {
  const family = await requireFamily();
  if (family) {
    mountNavbar(document.getElementById('navbar'), { activePage: 'calendar', session });
  }
}
