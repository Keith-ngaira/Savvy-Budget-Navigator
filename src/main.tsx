import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initOfflineSync, flushQueue } from './lib/offlineQueue'

// Register service worker for PWA and offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = '/sw.js';
    
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register(swUrl)
        .then(registration => {
          console.log('ServiceWorker registration successful');
          
          // Register for periodic background sync
          if ('sync' in registration) {
            // Request permission for background sync
            navigator.serviceWorker.ready.then(swRegistration => {
              // Register sync event
              swRegistration.sync.register('sync-queue');
              
              // Send message to service worker to register sync
              if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                  type: 'REGISTER_FLUSH_SYNC'
                });
              }
            });
          }
        })
        .catch(error => {
          console.error('Error during service worker registration:', error);
        });
    } else if (import.meta.env.DEV) {
      // In development, unregister any existing service workers
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) {
          registration.unregister().then(() => {
            console.log('Unregistered old service worker');
          });
        }
      });
    }
  });
  
  // Listen for messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'FLUSH_QUEUE') {
      console.log('Service worker requested queue flush');
      flushQueue().catch(console.error);
    }
  });
  
  // Listen for online/offline events
  window.addEventListener('online', () => {
    console.log('App is online, flushing queue');
    flushQueue().catch(console.error);
  });
}

// Initialize offline sync functionality
initOfflineSync();

// Development mode logging
if (import.meta.env.DEV) {
  const send = (line: string) => {
    try {
      const b = new Blob([line.endsWith('\n') ? line : line + '\n'], { type: 'text/plain' });
      if (navigator.sendBeacon) {
        const ok = navigator.sendBeacon('/__log', b);
        if (ok) return;
      }
      fetch('/__log', { method: 'POST', body: line + '\n', keepalive: true });
    } catch {}
  };
  const toStr = (v: any) => {
    if (v instanceof Error) return v.stack || `${v.name}: ${v.message}`;
    try { return typeof v === 'string' ? v : JSON.stringify(v); } catch { return String(v); }
  };
  const shouldDrop = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes('[securestorage]') && t.includes('web crypto unavailable')) return true;
    if (t.includes('web crypto unavailable, using unencrypted localstorage')) return true;
    return false;
  };
  const methods = ['log', 'info', 'warn', 'error', 'debug'] as const;
  for (const level of methods) {
    const orig = (console[level] as (...args: any[]) => void).bind(console);
    (console as any)[level] = (...args: any[]) => {
      try {
        const ts = new Date().toISOString();
        const line = `[${ts}] [${level}] ${args.map(toStr).join(' ')}`;
        if (!shouldDrop(line)) send(line);
      } catch {}
      orig(...args);
    };
  }
  window.addEventListener('error', (e) => {
    const ts = new Date().toISOString();
    const msg = e.error instanceof Error ? (e.error.stack || e.error.message) : String(e.message || 'error');
    const line = `[${ts}] [uncaught] ${msg}`;
    if (!shouldDrop(line)) send(line);
  });
  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const ts = new Date().toISOString();
    const reason = (e as any).reason;
    const msg = reason instanceof Error ? (reason.stack || reason.message) : toStr(reason);
    const line = `[${ts}] [unhandledrejection] ${msg}`;
    if (!shouldDrop(line)) send(line);
  });
}

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker and init offline sync
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
    initOfflineSync();
  });
}
