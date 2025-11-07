const DB_NAME = 'sbn-cache';
const DB_VERSION = 1;
const STORES = ['income_sources','bills'];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function setCache(store: string, items: any[]) {
  try {
    const db = await openDB();
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    const clearReq = os.clear();
    await new Promise((res) => { clearReq.onsuccess = () => res(null); clearReq.onerror = () => res(null); });
    for (const item of items || []) os.put(item);
    await new Promise((res) => { tx.oncomplete = () => res(null); tx.onerror = () => res(null); });
    db.close();
  } catch {}
}

export async function getCache(store: string): Promise<any[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(store, 'readonly');
    const os = tx.objectStore(store);
    const req = os.getAll();
    const result: any[] = await new Promise((resolve) => { req.onsuccess = () => resolve(req.result || []); req.onerror = () => resolve([]); });
    db.close();
    return result;
  } catch {
    return [];
  }
}
