type QueueAction = {
  id: string;
  type: 'add-transaction';
  payload: any;
  createdAt: number;
};

const KEY = 'sbn-offline-queue-v1';

function load(): QueueAction[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function save(q: QueueAction[]) { localStorage.setItem(KEY, JSON.stringify(q)); }

function uuid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

export function enqueueAction(type: QueueAction['type'], payload: any) {
  const q = load();
  q.push({ id: uuid(), type, payload, createdAt: Date.now() });
  save(q);
}

export async function flushQueue() {
  const q = load();
  if (q.length === 0) return;
  const remaining: QueueAction[] = [];
  for (const item of q) {
    try {
      if (item.type === 'add-transaction') {
        await addTransactionOnline(item.payload);
      } else {
        remaining.push(item);
      }
    } catch {
      // Keep item for next attempt
      remaining.push(item);
    }
  }
  save(remaining);
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

export function initOfflineSync() {
  window.addEventListener('online', () => {
    flushQueue();
  });
  // Attempt a flush on load as well
  if (navigator.onLine) {
    flushQueue();
  }
}

export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
