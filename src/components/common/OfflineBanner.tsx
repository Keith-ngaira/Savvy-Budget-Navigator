import { useEffect, useState } from 'react';
import { isOnline } from '@/lib/offlineQueue';

export const OfflineBanner = () => {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (online) return null;

  return (
    <div className="w-full bg-warning/20 text-warning border-b border-warning/40 text-sm py-2 px-4 text-center">
      You are offline. New changes will be queued and sync when back online.
    </div>
  );
};

export default OfflineBanner;
