// Extend the ServiceWorkerRegistration interface to include the sync property
declare interface ServiceWorkerRegistration {
  readonly sync: SyncManager;
}

// Define the SyncManager interface
declare interface SyncManager {
  getTags(): Promise<string[]>;
  register(tag: string): Promise<void>;
}

// Extend the Navigator interface to include the serviceWorker property
declare interface Navigator {
  serviceWorker: ServiceWorkerContainer;
}

// Extend the Window interface to include the service worker types
declare interface Window {
  __WB_MANIFEST: string[];
  skipWaiting(): Promise<void>;
}
