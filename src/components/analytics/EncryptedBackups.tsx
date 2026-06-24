import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Upload, RefreshCw, Trash2, Shield } from "lucide-react";
import { ensurePassphrase, encryptJSON, decryptJSON, secureGet, secureSet } from "@/lib/secureStorage";

interface BackupEntry { name: string; id: string; updated_at?: string; created_at?: string; size?: number }

const BUCKET = "backups";

export const EncryptedBackups = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<BackupEntry[]>([]);
  const [prefix, setPrefix] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setPrefix(`backups/${user.id}`);
      await loadEntries(user.id);
    };
    init();
  }, []);

  const loadEntries = async (uid: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage.from(BUCKET).list(`backups/${uid}`, { limit: 50, offset: 0, sortBy: { column: 'created_at', order: 'desc' } as any });
      if (error) throw error;
      if (Array.isArray(data)) {
        setEntries(data.map((d) => ({ name: d.name, id: d.id as any, updated_at: (d as any).updated_at, created_at: (d as any).created_at, size: d.metadata?.size })));
      } else {
        setEntries([]);
      }
    } catch (e: any) {
      toast({ title: "Failed to list backups", description: e.message || String(e), variant: "destructive" });
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const collectData = async () => {
    if (!userId) throw new Error("No user");
    // Read current secure blobs
    const investments = await secureGet(`investments:${userId}`);
    const snaps = await secureGet(`investment-snapshots:${userId}`);
    const debts = await secureGet(`debts:${userId}`);
    const payments = await secureGet(`debt-payments:${userId}`);
    const networth = await secureGet(`networth:${userId}`);
    return { version: 1, createdAt: new Date().toISOString(), userId, investments, snaps, debts, payments, networth };
  };

  const backupNow = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      await ensurePassphrase();
      const data = await collectData();
      const payload = await encryptJSON(data);
      const blob = new Blob([payload], { type: 'application/json' });
      const ts = new Date();
      const name = `backup-${ts.getFullYear()}-${String(ts.getMonth()+1).padStart(2,'0')}-${String(ts.getDate()).padStart(2,'0')}_${String(ts.getHours()).padStart(2,'0')}${String(ts.getMinutes()).padStart(2,'0')}${String(ts.getSeconds()).padStart(2,'0')}.json`;
      const { error } = await supabase.storage.from(BUCKET).upload(`${prefix}/${name}`, blob, { contentType: 'application/json', upsert: false });
      if (error) throw error;
      toast({ title: "Backup uploaded", description: name });
      await loadEntries(userId);
    } catch (e: any) {
      toast({ title: "Backup failed", description: e.message || String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const restore = async (name: string) => {
    if (!userId) return;
    try {
      setLoading(true);
      await ensurePassphrase();
      const { data, error } = await supabase.storage.from(BUCKET).download(`${prefix}/${name}`);
      if (error) throw error;
      const text = await data.text();
      const obj = await decryptJSON(text);
      if (!obj || obj.userId !== userId) throw new Error("Backup does not belong to current user or is invalid");
      await secureSet(`investments:${userId}`, obj.investments || []);
      await secureSet(`investment-snapshots:${userId}`, obj.snaps || []);
      await secureSet(`debts:${userId}`, obj.debts || []);
      await secureSet(`debt-payments:${userId}`, obj.payments || []);
      await secureSet(`networth:${userId}`, obj.networth || []);
      toast({ title: "Restore complete", description: name });
      // Optionally signal refresh via event
      window.dispatchEvent(new Event('storage'));
    } catch (e: any) {
      toast({ title: "Restore failed", description: e.message || String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const remove = async (name: string) => {
    if (!userId) return;
    try {
      setLoading(true);
      const { error } = await supabase.storage.from(BUCKET).remove([`${prefix}/${name}`]);
      if (error) throw error;
      toast({ title: "Deleted backup", description: name });
      await loadEntries(userId);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message || String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><Shield className="h-5 w-5" /> Encrypted Backups</CardTitle>
        <CardDescription>Encrypt and backup your local data to Supabase Storage. Restores require the same passphrase.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Button onClick={backupNow} disabled={loading || !userId} variant="hero" size="sm"><Upload className="h-4 w-4" /> Backup Now</Button>
          <Button onClick={() => userId && loadEntries(userId)} disabled={loading || !userId} size="sm" variant="outline"><RefreshCw className="h-4 w-4" /> Refresh</Button>
        </div>
        {userId ? (
          <div className="space-y-2">
            {entries.length === 0 ? (
              <div className="text-sm text-muted-foreground">No backups yet.</div>
            ) : (
              entries.map((it) => (
                <div key={it.name} className="p-2 rounded border flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium">{it.name}</div>
                    {it.updated_at && <div className="text-xs text-muted-foreground">Updated: {new Date(it.updated_at).toLocaleString()}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => restore(it.name)}><Download className="h-4 w-4" /> Restore</Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(it.name)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Please sign in to use backups.</div>
        )}
      </CardContent>
    </Card>
  );
}
