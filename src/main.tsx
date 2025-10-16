import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initOfflineSync } from './lib/offlineQueue.ts'

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker and init offline sync
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
    initOfflineSync();
  });
}
