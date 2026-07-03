import './core/bootstrap.js';
import './styles/main.css';
import { APP_NAME } from './core/config.js';
import { renderNavbar } from './core/ui.js';

document.title = `${APP_NAME} — Profile`;
document.getElementById('navbar').innerHTML = renderNavbar('profile');
