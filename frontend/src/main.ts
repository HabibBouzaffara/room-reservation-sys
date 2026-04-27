import 'zone.js';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

// Override default alert with a beautiful toast notification
const originalAlert = window.alert;
window.alert = (message: any) => {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  
  // Set different left border colors based on keywords in message
  const lowerMsg = String(message).toLowerCase();
  if (lowerMsg.includes('success')) {
    toast.style.borderLeftColor = 'var(--success-color)';
  } else if (lowerMsg.includes('error') || lowerMsg.includes('fail') || lowerMsg.includes('cannot')) {
    toast.style.borderLeftColor = 'var(--danger-color)';
  }

  toast.innerHTML = `<div>${message}</div>`;
  container.appendChild(toast);

  // Remove toast after animation finishes (0.4s + 3.5s = 3.9s total)
  setTimeout(() => {
    if (container && toast.parentNode === container) {
      container.removeChild(toast);
    }
  }, 3900);
};

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
