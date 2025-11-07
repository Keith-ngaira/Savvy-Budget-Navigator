type QueueAction = {
  id: string;
  type: 'add-transaction' | 'add-bill' | 'add-income';
  payload: any;
  createdAt: number;
  retryCount: number;
  lastAttempt?: number;
};

const KEY = 'sbn-offline-queue-v2';
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

function load(): QueueAction[] {
  try { 
    return JSON.parse(localStorage.getItem(KEY) || '[]'); 
  } catch (e) { 
    console.error('Failed to load queue from localStorage', e);
    return []; 
  }
}

function save(q: QueueAction[]) { 
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch (e) {
    console.error('Failed to save queue to localStorage', e);
  }
}

function uuid() { 
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function enqueueAction(type: QueueAction['type'], payload: any): string {
  const q = load();
  const id = uuid();
  const newItem = { 
    id, 
    type, 
    payload, 
    createdAt: Date.now(),
    retryCount: 0,
    lastAttempt: undefined
  };
  q.push(newItem);
  save(q);
  
  // Try to process the queue if online
  if (isOnline()) {
    flushQueue().catch(console.error);
  }
  
  return id;
}

async function processWithRetry<T>(
  action: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt + 1} failed:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError || new Error('Operation failed after all retries');
}

export async function flushQueue() {
  if (!isOnline()) return;
  
  const q = load();
  if (q.length === 0) return;
  
  const now = Date.now();
  const remaining: QueueAction[] = [];
  const processed: string[] = [];
  
  for (const item of q) {
    // Skip if we've already tried recently (exponential backoff)
    const timeSinceLastAttempt = item.lastAttempt ? now - item.lastAttempt : Infinity;
    const backoffDelay = Math.min(RETRY_DELAY * Math.pow(2, item.retryCount), 300000); // Max 5 minutes
    
    if (item.lastAttempt && timeSinceLastAttempt < backoffDelay) {
      remaining.push(item);
      continue;
    }
    
    try {
      let success = false;
      
      await processWithRetry(async () => {
        if (item.type === 'add-transaction') {
          await addTransactionOnline(item.payload);
        } else if (item.type === 'add-bill') {
          await addBillOnline(item.payload);
        } else if (item.type === 'add-income') {
          await addIncomeOnline(item.payload);
        } else {
          throw new Error(`Unknown action type: ${item.type}`);
        }
        success = true;
      });
      
      if (success) {
        processed.push(item.id);
      } else {
        throw new Error('Action failed after retries');
      }
      
    } catch (error) {
      console.error(`Failed to process action ${item.id}:`, error);
      
      if (item.retryCount < MAX_RETRIES) {
        remaining.push({
          ...item,
          retryCount: item.retryCount + 1,
          lastAttempt: now
        });
      } else {
        console.warn(`Giving up on action ${item.id} after ${MAX_RETRIES} retries`);
        // Optionally notify the user about the failure
      }
    }
  }
  
  if (remaining.length < q.length) {
    save(remaining);
  }
  
  // Notify the app that the queue was processed
  if (processed.length > 0) {
    window.dispatchEvent(new CustomEvent('queue-updated', { 
      detail: { processed, remaining: remaining.length }
    }));
  }
}

async function addTransactionOnline(payload: any) {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No user');
  const { error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: payload.type,
      amount: payload.amount,
      category: payload.category,
      description: payload.description,
      date: payload.date,
      tags: payload.tags?.length ? payload.tags.join(',') : null,
      notes: payload.notes || null,
    });
  if (error) throw error;
}

async function addBillOnline(payload: any) {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No user');
  const { error } = await supabase
    .from('bills')
    .insert({
      user_id: user.id,
      name: payload.name,
      amount: payload.amount,
      category: payload.category,
      due_date: payload.due_date,
      frequency: payload.frequency,
      is_paid: payload.is_paid ?? false,
      reminder_days: payload.reminder_days ?? 0,
    });
  if (error) throw error;
}

async function addIncomeOnline(payload: any) {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No user');
  const { error } = await supabase
    .from('income_sources')
    .insert({
      user_id: user.id,
      source: payload.source,
      amount: payload.amount,
      date: payload.date,
      notes: payload.notes || null,
    });
  if (error) throw error;
}

export function initOfflineSync() {
  window.addEventListener('online', () => {
    flushQueue();
  });
  if (navigator.onLine) {
    flushQueue();
  }
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e && e.data && e.data.type === 'FLUSH_OFFLINE_QUEUE') flushQueue();
    });
    navigator.serviceWorker.controller.postMessage({ type: 'REGISTER_FLUSH_SYNC' });
  }
}

export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
